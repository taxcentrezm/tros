import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const { entry_id } = req.query;

    // Base query
    let query = `
      SELECT 
        jl.line_id,
        jl.entry_id,
        jl.debit,
        jl.credit,
        a.name AS account
      FROM journal_lines jl
      JOIN chart_of_accounts a ON jl.account_id = a.account_id
    `;

    // If an entry_id is provided, filter for that entry
    const params = [];
    if (entry_id) {
      query += " WHERE jl.entry_id = ?";
      params.push(entry_id);
    }

    query += " ORDER BY jl.entry_id DESC, jl.line_id ASC";

    const result = await client.execute(query, params);

    // No results found
    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: entry_id
          ? `No journal lines found for entry ${entry_id}`
          : "No journal lines found"
      });
    }

    // Map and clean the response
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
    res.status(500).json({
      success: false,
      error: "Server error",
      details: err.message
    });
  }
}
