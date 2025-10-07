import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const entry_id = req.query.entry_id;

    if (!entry_id) {
      return res.status(400).json({ error: "Missing entry_id parameter" });
    }

    const result = await client.execute({
      sql: `
        SELECT jl.line_id, jl.entry_id, jl.debit, jl.credit, 
               a.name AS account
        FROM journal_lines jl
        JOIN chart_of_accounts a ON jl.account_id = a.account_id
        WHERE jl.entry_id = ?
        ORDER BY jl.line_id ASC
      `,
      args: [entry_id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No journal lines found for entry_id ${entry_id}` });
    }

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
