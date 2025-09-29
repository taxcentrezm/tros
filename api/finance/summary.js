import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const revenue = await client.execute(`
      SELECT IFNULL(SUM(credit - debit), 0) AS total_revenue
      FROM trial_balance
      WHERE type='revenue';
    `);

    const expenses = await client.execute(`
      SELECT IFNULL(SUM(debit - credit), 0) AS total_expenses
      FROM trial_balance
      WHERE type='expense';
    `);

    const liabilities = await client.execute(`
      SELECT IFNULL(SUM(credit - debit), 0) AS total_liabilities
      FROM trial_balance
      WHERE type='liability';
    `);

    const capex = await client.execute(`
      SELECT IFNULL(SUM(amount),0) AS total_capex
      FROM finance_transactions
      WHERE type='capital_expense';
    `);

    const caprev = await client.execute(`
      SELECT IFNULL(SUM(amount),0) AS total_caprev
      FROM finance_transactions
      WHERE type='capital_revenue';
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
