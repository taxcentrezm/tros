// /api/finance/transactions.js
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN
});

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await db.execute(`
        SELECT transaction_id, date, description, category, amount, type
        FROM finance_transactions
        ORDER BY date DESC
      `);
      return res.status(200).json({ data: result.rows });
    }

    if (req.method === "POST") {
      const { date, description, category, amount, type } = req.body;

      await db.execute({
        sql: `
          INSERT INTO finance_transactions (date, description, category, amount, type)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [date, description, category, amount, type]
      });

      return res.status(201).json({ message: "✅ Transaction added" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
