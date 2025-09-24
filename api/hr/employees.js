// api/hr/employees.js

import { Pool } from "pg";

// 🔑 Use the DATABASE_URL from Vercel environment variables
// Example: postgresql://user:password@host:5432/dbname
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Needed for most cloud Postgres
});

export default async function handler(req, res) {
  // ✅ Setup CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      // 📌 Fetch all employees
      const result = await pool.query(
        `SELECT employee_id, first_name, last_name, gender, date_of_birth,
                department, hire_date, status, salary_grade, tpin, pacra_number
         FROM hr.employees
         ORDER BY employee_id`
      );
      return res.status(200).json({ data: result.rows });
    }

    if (req.method === "POST") {
      // 📌 Insert a new employee
      const {
        first_name,
        last_name,
        gender,
        date_of_birth,
        department,
        hire_date,
        status,
        salary_grade,
        tpin,
        pacra_number,
      } = req.body;

      if (!first_name || !last_name || !date_of_birth || !hire_date) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const insertQuery = `
        INSERT INTO hr.employees 
          (first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *;
      `;

      const values = [
        first_name,
        last_name,
        gender,
        date_of_birth,
        department,
        hire_date,
        status || "Active",
        salary_grade,
        tpin,
        pacra_number,
      ];

      const result = await pool.query(insertQuery, values);
      return res.status(201).json({ data: result.rows[0] });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API Error in /api/hr/employees:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
