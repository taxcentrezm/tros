import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    // 🟢 GET — Fetch all transactions
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

      const data = result.rows.map((row) => ({
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

    // 🟡 POST — Add a new transaction
    if (req.method === "POST") {
      let { date, description, amount, type, account_id, category } = req.body;

      // 🔍 Normalize & validate inputs
      date = date || new Date().toISOString().slice(0, 10);
      description = String(description || "").trim();
      amount = Number(amount);
      type = String(type || "").trim().toLowerCase();
      category = String(category || "").trim();
      account_id = String(account_id || "").trim();

      if (!date || !description || !amount || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 🧩 Default account if missing
      if (!account_id) {
        const cash = await client.execute(
          "SELECT account_id FROM chart_of_accounts WHERE name = 'Cash' LIMIT 1"
        );
        if (!cash.rows.length) {
          return res
            .status(400)
            .json({ error: "Default 'Cash' account not found in chart_of_accounts." });
        }
        account_id = cash.rows[0].account_id;
      }

      // ✅ Check if account exists
      const accountCheck = await client.execute({
        sql: "SELECT name FROM chart_of_accounts WHERE account_id = ? LIMIT 1",
        args: [account_id],
      });

      if (!accountCheck.rows.length) {
        return res.status(400).json({ error: `Invalid account_id: ${account_id}` });
      }

      // 📊 Determine debit/credit side
      const debit = ["expense", "capital_expense"].includes(type) ? amount : 0;
      const credit = ["income", "capital_revenue"].includes(type) ? amount : 0;

      // 🧾 1️⃣ Insert transaction (initially without entry_id)
      await client.execute({
        sql: `
          INSERT INTO transactions
          (account_id, date, description, debit, credit, category, type, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [account_id, date, description, debit, credit, category, type, amount],
      });

      // 🧾 2️⃣ Create corresponding journal entry
      await client.execute({
        sql: `INSERT INTO journal_entries (date, description) VALUES (?, ?)`,
        args: [date, description],
      });

      // 🧾 3️⃣ Retrieve new entry_id
      const entryResult = await client.execute({
        sql: `
          SELECT entry_id 
          FROM journal_entries
          WHERE date = ? AND description = ?
          ORDER BY entry_id DESC 
          LIMIT 1
        `,
        args: [date, description],
      });

      const entry_id = entryResult.rows[0]?.entry_id;
      if (!entry_id) {
        return res.status(500).json({ error: "Failed to retrieve journal entry ID" });
      }

      // 🔗 4️⃣ Link the transaction with journal entry
      await client.execute({
        sql: `
          UPDATE transactions
          SET entry_id = ?
          WHERE date = ? AND description = ?
        `,
        args: [entry_id, date, description],
      });

      // 🔁 5️⃣ Create double-entry journal lines
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

      // Find counterpart account
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

      // Insert debit & credit lines
      await client.execute({
        sql: `
          INSERT INTO journal_lines (entry_id, account_id, debit, credit)
          VALUES (?, ?, ?, ?), (?, ?, ?, ?)
        `,
        args: [
          entry_id,
          account_id,
          debit,
          credit,
          entry_id,
          counterpart_id,
          credit,
          debit,
        ],
      });

      console.log(`✅ Added transaction linked to entry_id: ${entry_id}`);

      return res.status(201).json({
        success: true,
        message: "✅ Transaction and journal entry successfully added",
        entry_id,
        transaction: {
          date,
          description,
          amount,
          type,
          account_id,
          category,
          entry_id,
        },
      });
    }

    // ❌ Invalid HTTP method
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/transactions:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
