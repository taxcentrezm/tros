// /api/finance/balance-sheet.js
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN
});

export default async function handler(req, res) {
  try {
    const result = await db.execute(`
      SELECT 
        strftime('%Y', je.date) AS fiscal_year,
        SUM(CASE WHEN a.type = 'asset' THEN jl.debit - jl.credit ELSE 0 END) AS assets,
        SUM(CASE WHEN a.type = 'liability' THEN jl.credit - jl.debit ELSE 0 END) AS liabilities,
        SUM(CASE WHEN a.type = 'equity' THEN jl.credit - jl.debit ELSE 0 END) AS equity
      FROM journal_lines jl
      JOIN accounts a ON jl.account_id = a.account_id
      JOIN journal_entries je ON jl.entry_id = je.entry_id
      GROUP BY fiscal_year
      ORDER BY fiscal_year DESC
    `);

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("❌ Error in /api/finance/balance-sheet:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
