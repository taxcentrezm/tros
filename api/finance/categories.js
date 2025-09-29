// api/finance/categories.js
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const result = await client.execute("SELECT DISTINCT category FROM finance_transactions");
    const categories = result.rows.map(row => row.category).filter(Boolean);
    res.status(200).json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}
