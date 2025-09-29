import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const result = await client.execute(`
      SELECT 
        a.name AS account,
        strftime('%Y', je.date) AS fiscal_year,
        SUM(jl.debit) AS debit,
        SUM(jl.credit) AS credit
      FROM journal_lines jl
      JOIN accounts a ON jl.account_id = a.account_id
      JOIN journal_entries je ON jl.entry_id = je.entry_id
      GROUP BY account, fiscal_year
      ORDER BY fiscal_year DESC, account;
    `);

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("❌ Error in /api/finance/trial-balance:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
}
