import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Fetch all transactions with account name from chart_of_accounts
const result = await client.execute(`
  SELECT t.transaction_id, t.date, t.description, 
         t.account_id, t.debit, t.credit, 
         t.category, t.type, a.name AS account_name
  FROM transactions t
  JOIN chart_of_accounts a ON t.account_id = a.account_id
  ORDER BY t.date DESC
`);

const data = result.rows.map(row => ({
  id: row.transaction_id,
  date: row.date,
  description: row.description,
  account_id: row.account_id,
  debit: row.debit,
  credit: row.credit,
  category: row.category,
  type: row.type,
  account: row.account_name,
}));

      return res.status(200).json({ success: true, data });
    }

    if (req.method === "POST") {
      const { date, description, amount, type, account_id, category } = req.body;

      // Basic validation
      if (!date || !description || !amount || !type || !account_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Ensure account_id exists in chart_of_accounts
      const accountCheck = await client.execute({
        sql: "SELECT 1 FROM chart_of_accounts WHERE account_id = ? LIMIT 1",
        args: [account_id],
      });

      if (accountCheck.rows.length === 0) {
        return res.status(400).json({ error: "Invalid account_id" });
      }

      // Determine debit or credit based on transaction type
      const debit = ["expense", "capital_expense"].includes(type) ? amount : 0;
      const credit = ["income", "capital_revenue"].includes(type) ? amount : 0;

      // Insert transaction
      await client.execute({
        sql: `
          INSERT INTO transactions
          (account_id, date, description, debit, credit, category, amount, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [account_id, date, description, debit, credit, category, amount, type],
      });

      return res.status(201).json({ success: true, message: "Transaction added" });
    }

    // Method not allowed
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    return res.status(500).json({ error: err.message });
  }
}
