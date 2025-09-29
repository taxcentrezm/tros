// /api/finance/summary.js
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN
});

export default async function handler(req, res) {
  try {
    // Revenue (sum of credits for revenue accounts)
    const revenue = await db.execute(`
      SELECT IFNULL(SUM(credit - debit), 0) AS total_revenue
      FROM trial_balance
      WHERE type = 'revenue';
    `);

    // Expenses (sum of debits for expense accounts)
    const expenses = await db.execute(`
      SELECT IFNULL(SUM(debit - credit), 0) AS total_expenses
      FROM trial_balance
      WHERE type = 'expense';
    `);

    // Liabilities (balance of liability accounts)
    const liabilities = await db.execute(`
      SELECT IFNULL(SUM(credit - debit), 0) AS total_liabilities
      FROM trial_balance
      WHERE type = 'liability';
    `);

    // Capital Expenses (transactions tagged as capex)
    const capex = await db.execute(`
      SELECT IFNULL(SUM(amount), 0) AS total_capex
      FROM finance_transactions
      WHERE type = 'capital_expense';
    `);

    // Capital Revenue (transactions tagged as caprev)
    const caprev = await db.execute(`
      SELECT IFNULL(SUM(amount), 0) AS total_caprev
      FROM finance_transactions
      WHERE type = 'capital_revenue';
    `);

    const totalRevenue = revenue.rows[0].total_revenue || 0;
    const totalExpenses = expenses.rows[0].total_expenses || 0;
    const netProfit = totalRevenue - totalExpenses;

    res.status(200).json({
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      total_capex: capex.rows[0].total_capex || 0,
      total_caprev: caprev.rows[0].total_caprev || 0,
      total_liabilities: liabilities.rows[0].total_liabilities || 0
    });
  } catch (err) {
    console.error("❌ Error in /api/finance/summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
