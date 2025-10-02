import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await client.execute(`
        SELECT t.transaction_id, t.date, t.description,
               t.account_id, t.debit, t.credit,
               t.category, t.type, t.amount,
               a.name AS account_name
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
        amount: row.amount,
        account: row.account_name,
      }));

      return res.status(200).json({ success: true, data });
    }

    if (req.method === "POST") {
      let { date, description, amount, type, account_id, category } = req.body;

      // Type safety
      date = typeof date === "string" ? date : new Date(date).toISOString().slice(0, 10);
      description = String(description || "");
      amount = Number(amount);
      category = String(category || "");
      type = String(type || "");
      account_id = String(account_id || "");

      if (!date || !description || !amount || !type || !account_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const accountCheck = await client.execute({
        sql: "SELECT 1 FROM chart_of_accounts WHERE account_id = ? LIMIT 1",
        args: [account_id],
      });

      if (accountCheck.rows.length === 0) {
        return res.status(400).json({ error: "Invalid account_id" });
      }

      const debit = ["expense", "capital_expense"].includes(type) ? amount : 0;
      const credit = ["income", "capital_revenue"].includes(type) ? amount : 0;

      await client.execute({
        sql: `
          INSERT INTO transactions
          (account_id, date, description, debit, credit, category, type, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [account_id, date, description, debit, credit, category, type, amount],
      });

      const reference = `TX-${Date.now()}`;
      await client.execute({
        sql: `
          INSERT INTO journal_entries (date, description, reference)
          VALUES (?, ?, ?)
        `,
        args: [date, description, reference],
      });

      const entryResult = await client.execute({
        sql: "SELECT entry_id FROM journal_entries WHERE reference = ? LIMIT 1",
        args: [reference],
      });

      const entry_id = entryResult.rows[0]?.entry_id;
      if (!entry_id) {
        return res.status(500).json({ error: "Failed to retrieve journal entry ID" });
      }

      // Resolve counterpart account
      const fallbackName = ["income", "capital_revenue"].includes(type) ? "cash" : "expenses";
     const counterpartCheck = await client.execute({
  sql: "SELECT account_id FROM chart_of_accounts WHERE account_id = ? LIMIT 1",
  args: ["cash"],
});


      const counterpart_id = counterpartCheck.rows[0]?.account_id;
      if (!counterpart_id) {
        return res.status(400).json({ error: `Counterpart account '${fallbackName}' not found` });
      }

      await client.execute({
        sql: `
          INSERT INTO journal_lines (entry_id, account_id, debit, credit)
          VALUES (?, ?, ?, ?), (?, ?, ?, ?)
        `,
        args: [
          entry_id, account_id, debit, credit,
          entry_id, counterpart_id, credit, debit
        ],
      });

      return res.status(201).json({ success: true, message: "Transaction and journal entry added" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
