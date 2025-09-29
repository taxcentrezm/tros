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
      const { date, description, category, amount, type, account_id } = req.body;

      // Validate required fields
      if (!date || !description || !amount || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Determine final account_id
      let finalAccountId = account_id;
      if (!finalAccountId && category) {
        const accountRes = await client.execute({
          sql: `SELECT account_id FROM chart_of_accounts WHERE name = ? LIMIT 1`,
          args: [category],
        });

        if (accountRes.rows.length === 0) {
          return res.status(400).json({ error: "Invalid category selected" });
        }

        finalAccountId = accountRes.rows[0].account_id;
      }

      if (!finalAccountId) {
        return res.status(400).json({ error: "Account not found" });
      }

      // Assign debit/credit based on type
      let debit = 0;
      let credit = 0;
      if (type === "expense" || type === "capital_expense") {
        debit = amount;
      } else if (type === "income" || type === "capital_revenue") {
        credit = amount;
      }

      // Insert transaction
      await client.execute({
        sql: `
          INSERT INTO finance_transactions
          (account_id, date, description, debit, credit, category, amount, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          finalAccountId,
          date,
          description,
          debit,
          credit,
          category || null,
          amount,
          type,
        ],
      });

      return res.status(201).json({ success: true, message: "Transaction added" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    return res.status(500).json({ error: err.message });
  }
}
