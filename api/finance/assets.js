// api/finance/assets.js
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const purchases = await client.execute(`
      SELECT category, SUM(amount) AS purchase
      FROM finance_transactions
      WHERE type='capital_expense'
      GROUP BY category;
    `);

    const sales = await client.execute(`
      SELECT category, SUM(amount) AS sale
      FROM finance_transactions
      WHERE type='asset_sale'
      GROUP BY category;
    `);

    // Normalize results (SQLite may return strings for numbers)
    const purchaseMap = {};
    purchases.rows.forEach(p => {
      purchaseMap[p.category] = Number(p.purchase || 0);
    });

    const saleMap = {};
    sales.rows.forEach(s => {
      saleMap[s.category] = Number(s.sale || 0);
    });

    // Merge purchases + sales categories
    const allCategories = new Set([
      ...Object.keys(purchaseMap),
      ...Object.keys(saleMap),
    ]);

    const assets = Array.from(allCategories).map(category => {
      const purchase = purchaseMap[category] || 0;
      const sale = saleMap[category] || 0;
      const gainLoss = sale - purchase;

      return {
        category,
        purchase,
        sale,
        gain_loss: gainLoss,
        status:
          gainLoss > 0
            ? "Gain"
            : gainLoss < 0
            ? "Loss"
            : "Break-even",
      };
    });

    res.status(200).json({ data: assets });
  } catch (err) {
    console.error("❌ Error in /api/finance/assets:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
}
