// /api/finance/assets.js
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN
});

export default async function handler(req, res) {
  try {
    const purchases = await db.execute(`
      SELECT category, SUM(amount) AS total_purchase
      FROM finance_transactions
      WHERE type = 'capital_expense'
      GROUP BY category
    `);

    const sales = await db.execute(`
      SELECT category, SUM(amount) AS total_sale
      FROM finance_transactions
      WHERE type = 'asset_sale'
      GROUP BY category
    `);

    // Merge results into lifecycle array
    const assets = purchases.rows.map(p => {
      const sale = sales.rows.find(s => s.category === p.category);
      const purchase = p.total_purchase || 0;
      const saleAmount = sale ? sale.total_sale : 0;
      const gainLoss = saleAmount - purchase;
      return {
        category: p.category,
        purchase,
        sale: saleAmount,
        gain_loss: gainLoss,
        status: gainLoss > 0 ? "Gain" : gainLoss < 0 ? "Loss" : "Break-even"
      };
    });

    return res.status(200).json({ data: assets });
  } catch (err) {
    console.error("❌ Error in /api/finance/assets:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
