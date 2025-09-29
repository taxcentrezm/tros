import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

export default async function handler(req, res) {
  try {
    // Aggregate total debit and credit per account
    const result = await client.execute(`
      SELECT 
        account_id, 
        SUM(debit) AS debit, 
        SUM(credit) AS credit
      FROM finance_transactions
      GROUP BY account_id
    `);

    // Map results to a clean JSON structure
    const summary = result.rows.map(row => ({
      account_id: row[0],
      total_debit: row[1] || 0,
      total_credit: row[2] || 0,
    }));

    res.status(200).json(summary);
  } catch (err) {
    console.error("❌ Error in /api/finance/summary:", err);
    res.status(500).json({ error: err.message });
  }
}
