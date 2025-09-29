// /api/finance/trial-balance.js
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN
});

export default async function handler(req, res) {
  try {
    const result = await db.execute(`
      SELECT 
        a.name AS account,
        strftime('%Y', je.date) AS fiscal_year,
        SUM(jl.debit) AS debit,
        SUM(jl.credit) AS credit
      FROM journal_lines jl
      JOIN accounts a ON jl.account_id = a.account_id
      JOIN journal_entries je ON jl.entry_id = je.entry_id
      GROUP BY account, fiscal_year
      ORDER BY fiscal_year DESC, account
    `);

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("❌ Error in /api/finance/trial-balance:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
