import { sql } from "@libsql/client";

const client = sql({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

export default async function handler(req, res) {
  try {
    // Get the summary: total debit, total credit, balance per account
    const result = await client.execute(
      `
      SELECT 
        a.account_id,
        COALESCE(SUM(t.debit), 0) AS total_debit,
        COALESCE(SUM(t.credit), 0) AS total_credit,
        COALESCE(SUM(t.debit) - SUM(t.credit), 0) AS balance
      FROM finance_transactions t
      INNER JOIN accounts a ON t.account_id = a.account_id
      GROUP BY a.account_id
      ORDER BY a.account_id
      `
    );

    // Transform result to JSON
    const summary = result.rows.map((row) => ({
      account_id: row.account_id,
      total_debit: row.total_debit,
      total_credit: row.total_credit,
      balance: row.balance,
    }));

    res.status(200).json({ summary });
  } catch (err) {
    console.error("❌ Error in /api/finance/summary:", err);
    res.status(500).json({
      error: "Failed to fetch finance summary",
      details: err.message,
    });
  }
}
