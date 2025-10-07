import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    // 🟢 GET — fetch transactions
    if (req.method === "GET") {
      const result = await client.execute(`
        SELECT 
          t.transaction_id,
          t.entry_id,
          t.date,
          t.description,
          t.account_id,
          t.debit,
          t.credit,
          t.category,
          t.type,
          t.amount,
          a.name AS account_name
        FROM transactions t
        JOIN chart_of_accounts a ON t.account_id = a.account_id
        ORDER BY t.date DESC
      `);

      const data = result.rows.map(row => ({
        id: row.transaction_id,
        entry_id: row.entry_id,
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

    // 🟡 POST — add new transaction
    if (req.method === "POST") {
      let { date, description, amount, type, account_id, category } = req.body;

      // Normalize + validate
      date = date || new Date().toISOString().slice(0, 10);
      description = String(description || "").trim();
      amount = Number(amount);
      type = String(type || "").trim().toLowerCase();
      category = String(category || "").trim();
      account_id = String(account_id || "").trim();

      if (!date || !description || !amount || !type || !account_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // ✅ Check if account_id exists
      const accountCheck = await client.execute({
        sql: "SELECT name FROM chart_of_accounts WHERE account_id = ? LIMIT 1",
        args: [account_id],
      });

      if (!accountCheck.rows.length) {
        return res.status(400).json({ error: `Invalid account_id: ${account_id}` });
      }

      // Derive debit/credit automatically
      const debit = ["expense", "capital_expense"].includes(type) ? amount : 0;
      const credit = ["income", "capital_revenue"].includes(type) ? amount : 0;

      // 🧾 1️⃣ Insert into transactions (temporarily without entry_id)
      const txResult = await client.execute({
        sql: `
          INSERT INTO transactions
          (account_id, date, description, debit, credit, category, type, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [account_id, date, description, debit, credit, category, type, amount],
      });

      // 🧾 2️⃣ Create a matching journal entry
      await client.execute({
        sql: `INSERT INTO journal_entries (date, description) VALUES (?, ?)`,
        args: [date, description],
      });

      // Get the new entry_id
      const entryResult = await client.execute({
        sql: `
          SELECT entry_id FROM journal_entries
          WHERE date = ? AND description = ?
          ORDER BY entry_id DESC LIMIT 1
        `,
        args: [date, description],
      });
      const entry_id = entryResult.rows[0]?.entry_id;
      if (!entry_id) {
        return res.status(500).json({ error: "Failed to retrieve journal entry ID" });
      }

      // 🔗 3️⃣ Link the transaction with the journal entry
      await client.execute({
        sql: `
          UPDATE transactions
          SET entry_id = ?
          WHERE date = ? AND description = ?
        `,
        args: [entry_id, date, description],
      });

      // 🧾 4️⃣ Insert journal lines (double entry)
      const typeToAccount = {
        income: "Cash",
        capital_revenue: "Cash",
        expense: "Salaries Expense",
        capital_expense: "Supplies Expense",
        liability: "Accounts Payable",
        asset: "Vehicle Asset",
        equity: "Equity Capital",
      };
      const fallbackName = typeToAccount[type] || "Suspense";

      const counterpartCheck = await client.execute({
        sql: "SELECT account_id FROM chart_of_accounts WHERE name = ? LIMIT 1",
        args: [fallbackName],
      });

      const counterpart_id = counterpartCheck.rows[0]?.account_id;
      if (!counterpart_id) {
        return res.status(400).json({
          error: `Counterpart account '${fallbackName}' not found in chart_of_accounts.`,
        });
      }

      await client.execute({
        sql: `
          INSERT INTO journal_lines (entry_id, account_id, debit, credit)
          VALUES (?, ?, ?, ?), (?, ?, ?, ?)
        `,
        args: [
          entry_id, account_id, debit, credit,
          entry_id, counterpart_id, credit, debit,
        ],
      });

      return res.status(201).json({
        success: true,
        message: "✅ Transaction and journal entry successfully added",
        entry_id,
      });
    }

    // ❌ Invalid method
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
