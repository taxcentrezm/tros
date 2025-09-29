import { client } from "../../lib/db"; // your Turso client

export default async function handler(req, res) {
  try {
    const result = await client.execute("SELECT DISTINCT category FROM finance_transactions");
    const categories = result.rows.map(row => row.category);
    res.status(200).json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}
