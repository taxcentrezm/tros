// api/finance/chart_of_accounts.js
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    // Create table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        account_id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense'))
      );
    `);

    // Prepopulate if empty
    const rows = await client.execute(`SELECT COUNT(*) AS cnt FROM chart_of_accounts;`);
    if (rows.rows[0].cnt === 0) {
      await client.execute(`
        INSERT INTO chart_of_accounts (code, name, type) VALUES
          ('1000', 'Cash', 'asset'),
          ('1100', 'Accounts Receivable', 'asset'),
          ('2000', 'Accounts Payable', 'liability'),
          ('3000', 'Equity', 'equity'),
          ('4000', 'Sales Revenue', 'revenue'),
          ('5000', 'Cost of Goods Sold', 'expense'),
          ('5100', 'Operating Expenses', 'expense'),
          ('5200', 'Depreciation', 'expense');
      `);
    }

    if (req.method === "GET") {
      const accounts = await client.execute(`SELECT * FROM chart_of_accounts ORDER BY code;`);
      return res.status(200).json({ success: true, data: accounts.rows });
    }

    if (req.method === "POST") {
      const { code, name, type } = req.body;
      await client.execute(
        `INSERT INTO chart_of_accounts (code, name, type) VALUES (?, ?, ?);`,
        [code, name, type]
      );
      return res.status(201).json({ success: true, message: "Account added" });
    }

    res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/finance/chart_of_accounts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
