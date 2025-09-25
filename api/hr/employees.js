// employees.js (Turso/SQLite version)
import { createClient } from "@turso/database";

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

export default async function handler(req, res) {
  try {
    const result = await db.execute(`
      SELECT employee_id, first_name, last_name, tpin, pacra_number, department
      FROM hr_employees
      ORDER BY employee_id
    `);

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("❌ Error fetching employees:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
}
