import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://taxcrwlh_admin:l26Nj!+?Fr0l@your-db-host:5432/taxcrwlh_tros",
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT employee_id, first_name, last_name, tpin, pacra_number, department
      FROM hr.employees
      ORDER BY employee_id
    `);
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Database error" });
  }
}
