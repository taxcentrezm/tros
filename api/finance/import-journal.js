import { client } from "../../db.js";
import { parse } from "csv-parse/sync";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { csvText, type } = req.body;
    if (!csvText || !type) {
      return res.status(400).json({ error: "Missing CSV data or type" });
    }

    const rows = parse(csvText, { columns: true, skip_empty_lines: true });
    const errors = [];
    const inserts = [];

    for (const row of rows) {
      if (type === "entries") {
        const { date, description } = row;
        if (!date || !description) {
          errors.push({ row, error: "Missing date or description" });
          continue;
        }
        inserts.push({ sql: "INSERT INTO journal_entries (date, description) VALUES (?, ?)", args: [date, description] });
      }

      if (type === "lines") {
        const { entry_id, account, debit, credit } = row;
        if (!entry_id || !account) {
          errors.push({ row, error: "Missing entry_id or account" });
          continue;
        }

        const accountCheck = await client.execute({
          sql: "SELECT account_id FROM chart_of_accounts WHERE name = ? LIMIT 1",
          args: [account],
        });

        const account_id = accountCheck.rows[0]?.account_id;
        if (!account_id) {
          errors.push({ row, error: `Account '${account}' not found` });
          continue;
        }

        inserts.push({
          sql: "INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)",
          args: [entry_id, account_id, Number(debit || 0), Number(credit || 0)],
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    for (const insert of inserts) {
      await client.execute(insert);
    }

    res.status(200).json({ success: true, message: `${inserts.length} rows imported` });
  } catch (err) {
    console.error("❌ Error in /api/finance/import-journal:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
