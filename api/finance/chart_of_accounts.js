// api/finance/chart_of_accounts.js
import db from "../db.js"; // adjust path to your db.js

// Create Chart of Accounts table if it doesn’t exist
await db.exec(`
  CREATE TABLE IF NOT EXISTS chart_of_accounts (
    account_id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense'))
  );
`);

// Prepopulate with common accounts if empty
const rows = await db.all(`SELECT COUNT(*) as cnt FROM chart_of_accounts`);
if (rows[0].cnt === 0) {
  await db.exec(`
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

// API Handler
export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const accounts = await db.all(`SELECT * FROM chart_of_accounts ORDER BY code`);
      return res.json({ success: true, data: accounts });
    }

    if (req.method === "POST") {
      const { code, name, type } = req.body;
      await db.run(
        `INSERT INTO chart_of_accounts (code, name, type) VALUES (?, ?, ?)`,
        [code, name, type]
      );
      return res.json({ success: true, message: "Account added" });
    }

    res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
