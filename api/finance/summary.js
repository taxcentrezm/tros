import { client} from "../../db.js";

export default async function handler(req, res) {
  try {
    // ================================
    // 1️⃣  Summary (Revenue, Expenses, etc.)
    // ================================
    const summaryResult = await client.execute(`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
        SUM(CASE WHEN type = 'capital_expense' THEN amount ELSE 0 END) AS capex,
        SUM(CASE WHEN type = 'capital_revenue' THEN amount ELSE 0 END) AS caprev,
        SUM(CASE WHEN type = 'liability' THEN amount ELSE 0 END) AS liabilities
      FROM transactions
    `);

    const s = summaryResult.rows[0] || {};
    const net_profit = (s.revenue || 0) - (s.expenses || 0);

    // ================================
    // 2️⃣  Extended Trial Balance (ETB)
    // ================================
    const etbResult = await client.execute(`
      SELECT
        a.name AS account_name,
        SUM(CASE WHEN jl.debit> 0 THEN jl.debit ELSE 0 END) AS debit,
        SUM(CASE WHEN jl.credit> 0 THEN jl.credit ELSE 0 END) AS credit,
        0 AS adjustments,
        SUM(
          CASE
            WHEN jl.debit> jl.credit THEN jl.debit - jl.credit
            ELSE jl.credit - jl.debit
          END
) AS closing_balance
      FROM journal_lines jl
      JOIN chart_of_accounts a ON a.account_id = jl.account_id
      GROUP BY a.name
      ORDER BY a.name
    `);

    // ================================
    // 3️⃣  Combined Response
    // ================================
    res.status(200).json({
      success: true,
      summary: {
        revenue: Number(s.revenue) || 0,
        expenses: Number(s.expenses) || 0,
        capex: Number(s.capex) || 0,
        caprev: Number(s.caprev) || 0,
        liabilities: Number(s.liabilities) || 0,
        net_profit,
},
      extended_trial_balance: etbResult.rows || [],
});

} catch (err) {
    console.error("SUMMARY + ETB ERROR:", err);
    res.status(500).json({ success: false, error: err.message});
}
}
