import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await client.execute(`
        SELECT transaction_id, date, description, category, amount, type
        FROM finance_transactions
        ORDER BY date DESC;
      `);
      return res.status(200).json({ data: result.rows });
    }

    if (req.method === "POST") {
      const { date, description, category, amount, type } = req.body;
      await client.execute(
        `INSERT INTO finance_transactions (date, description, category, amount, type) VALUES (?, ?, ?, ?, ?);`,
        [date, description, category, amount, type]
      );
      return res.status(201).json({ message: "✅ Transaction added" });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
}
