import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const result = await client.execute(`
      SELECT jl.line_id, jl.entry_id, jl.debit, jl.credit,
             a.name AS account
      FROM journal_lines jl
      JOIN chart_of_accounts a ON jl.account_id = a.account_id
      ORDER BY jl.entry_id DESC, jl.line_id ASC
    `);

    const data = result.rows.map(row => ({
      line_id: row.line_id,
      entry_id: row.entry_id,
      account: row.account,
      debit: row.debit,
      credit: row.credit
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("❌ Error in /api/finance/journal-lines:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
