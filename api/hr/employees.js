import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await pool.query(`
        SELECT employee_id, first_name, last_name, department, status, hire_date, email
        FROM hr.employees
        ORDER BY created_at DESC
      `);
      res.status(200).json({ data: result.rows });
    } catch (err) {
      console.error("Error fetching employees:", err);
      res.status(500).json({ error: "Database error" });
    }
  } else if (req.method === "POST") {
    try {
      const { first_name, last_name, department, status, email } = req.body;
      const result = await pool.query(
        `INSERT INTO hr.employees (first_name, last_name, department, status, hire_date, email)
         VALUES ($1,$2,$3,$4,NOW(),$5)
         RETURNING employee_id`,
        [first_name, last_name, department, status, email]
      );
      res.status(201).json({ message: "Employee added", id: result.rows[0].employee_id });
    } catch (err) {
      console.error("Error inserting employee:", err);
      res.status(500).json({ error: "Database error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
