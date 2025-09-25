// api/hr/employees.js
import { query } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await query(`
        SELECT employee_id, first_name, last_name, tpin, pacra_number, department, status, hire_date
        FROM employees
        ORDER BY employee_id
      `);
      return res.status(200).json({ data: rows });
    }

    if (req.method === "POST") {
      const body = req.body;
      const insert = await query(
        `INSERT INTO employees 
         (first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.first_name,
          body.last_name,
          body.gender,
          body.date_of_birth,
          body.department,
          body.hire_date,
          body.status,
          body.salary_grade,
          body.tpin,
          body.pacra_number,
        ]
      );
      return res.status(201).json({ success: true, insert });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Error in /api/hr/employees:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
}
