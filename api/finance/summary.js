import { client } from "../../db.js";

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
        SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END) AS debit,
        SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END) AS credit,
        0 AS adjustments,
        SUM(
          CASE
            WHEN jl.debit > jl.credit THEN jl.debit - jl.credit
            ELSE jl.credit - jl.debit
          END
        ) AS closing_balance
      FROM journal_lines jl
      JOIN chart_of_accounts a ON a.account_id = jl.account_id
      GROUP BY a.name
      ORDER BY a.name
    `);

    // ================================
    // 3️⃣  Monthly Trends (for line charts)
    // ================================
    const monthlyTrendsResult = await client.execute(`
      SELECT
        strftime('%Y-%m', date) AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
      FROM transactions
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `);

    // ================================
    // 4️⃣  Expense Breakdown (for pie chart)
    // ================================
    const expenseBreakdownResult = await client.execute(`
      SELECT
        category AS category_name,
        SUM(amount) AS total
      FROM transactions
      WHERE type = 'expense'
      GROUP BY category
      ORDER BY total DESC
      LIMIT 10
    `);

    // ================================
    // 5️⃣  Assets vs Liabilities (for bar chart)
    // ================================
    const balanceSummaryResult = await client.execute(`
      SELECT
        SUM(CASE WHEN type = 'asset' THEN amount ELSE 0 END) AS assets,
        SUM(CASE WHEN type = 'liability' THEN amount ELSE 0 END) AS liabilities,
        SUM(CASE WHEN type = 'equity' THEN amount ELSE 0 END) AS equity
      FROM transactions
    `);

    const b = balanceSummaryResult.rows[0] || {};

    // ================================
    // 6️⃣  Combined Response
    // ================================
    res.status(200).json({
      success: true,
      summary: {
        revenue: Number(s.revenue) || 0,
        expenses: Number(s.expenses) || 0,
        capex: Number(s.capex) || 0,
        caprev: Number(s.caprev) || 0,
        liabilities: Number(s.liabilities) || 0,
        assets: Number(b.assets) || 0,
        equity: Number(b.equity) || 0,
        net_profit,
      },
      extended_trial_balance: etbResult.rows || [],
      monthly_trends: monthlyTrendsResult.rows || [],
      expense_breakdown: Object.fromEntries(
        expenseBreakdownResult.rows.map((r) => [r.category_name, r.total])
      ),
    });
  } catch (err) {
    console.error("SUMMARY + ETB ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
