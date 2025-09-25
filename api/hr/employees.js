import { client } from "../../db.js"; // Turso db.js

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await client.execute(
        "SELECT employee_id, first_name, last_name, tpin, pacra_number, department, status, hire_date FROM employees ORDER BY employee_id"
      );
      res.status(200).json({ data: result.rows ?? [] });
    }

    if (req.method === "POST") {
      const { first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number } = req.body;

      const insert = await client.execute({
        sql: `INSERT INTO employees (first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number],
      });

      res.status(201).json({ success: true, id: insert.lastInsertRowid });
    }
  } catch (err) {
    console.error("❌ Error in /api/hr/employees:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
}
