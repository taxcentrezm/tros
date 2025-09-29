import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Fetch all transactions
      const result = await client.execute(`
        SELECT t.transaction_id, t.date, t.description, 
               t.category, t.amount, t.type, 
               t.debit, t.credit, a.name AS account_name
        FROM finance_transactions t
        JOIN chart_of_accounts a ON t.account_id = a.account_id
        ORDER BY t.date DESC
      `);

      const data = result.rows.map(row => ({
        id: row.transaction_id,
        date: row.date,
        description: row.description,
        category: row.category,
        amount: row.amount,
        type: row.type,
        debit: row.debit,
        credit: row.credit,
        account: row.account_name,
      }));

      return res.status(200).json({ success: true, data });
    }

    if (req.method === "POST") {
      let { date, description, category, amount, type, account_id } = req.body;

      if (!date || !description || !amount || !type || (!account_id && !category)) {
        return res.status(400).json({ error: "Missing required fields or account/category" });
      }

      // If account_id not provided, look it up by category name
      if (!account_id) {
        const accountRes = await client.execute({
          sql: `SELECT account_id FROM chart_of_accounts WHERE name = ? LIMIT 1`,
          args: [category],
        });
        if (accountRes.rows.length === 0) {
          return res.status(400).json({ error: "Invalid category selected" });
        }
        account_id = accountRes.rows[0].account_id;
      }

      // Look up category name if not provided
      if (!category) {
        const accountRes = await client.execute({
          sql: `SELECT name FROM chart_of_accounts WHERE account_id = ? LIMIT 1`,
          args: [account_id],
        });
        if (accountRes.rows.length === 0) {
          return res.status(400).json({ error: "Invalid account_id selected" });
        }
        category = accountRes.rows[0].name;
      }

      let debit = 0, credit = 0;
      if (type === "expense" || type === "capital_expense") debit = amount;
      else if (type === "income" || type === "capital_revenue") credit = amount;

      await client.execute({
        sql: `
          INSERT INTO finance_transactions
          (account_id, date, description, debit, credit, category, amount, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [account_id, date, description, debit, credit, category, amount, type],
      });

      return res.status(201).json({ success: true, message: "Transaction added" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    return res.status(500).json({ error: err.message });
  }
}
