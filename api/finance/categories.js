// api/finance/categories.js
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    const result = await client.execute("SELECT account_id, name, type FROM chart_of_accounts");
    const categories = result.rows.map(row => ({
      account_id: row.account_id,
      name: row.name,
      type: row.type
    }));
    res.status(200).json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}
