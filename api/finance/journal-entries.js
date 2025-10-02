import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const result = await client.execute(`
      SELECT entry_id, date, description
      FROM journal_entries
      ORDER BY date DESC
    `);

    const data = result.rows.map(row => ({
      entry_id: row.entry_id,
      date: row.date,
      description: row.description
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("❌ Error in /api/finance/journal-entries:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
