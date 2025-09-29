import { sql } from "@libsql/client";

const client = sql({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

export default async function handler(req, res) {
  try {
    // Aggregate debit, credit, and balance per account
    const result = await client.execute(`
      SELECT 
        account_id,
        SUM(debit) AS debit,
        SUM(credit) AS credit,
        SUM(debit) - SUM(credit) AS balance
      FROM finance_transactions
      GROUP BY account_id
      ORDER BY account_id
    `);

    res.status(200).json({ summary: result.rows });
  } catch (err) {
    console.error("❌ Error in /api/finance/summary:", err);
    res.status(500).json({ error: "Failed to fetch summary", details: err.message });
  }
}
