import { db } from "../../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await db.execute(`
        SELECT employee_id, first_name, last_name, tpin, pacra_number, department, status, hire_date
        FROM hr_employees
        ORDER BY employee_id
      `);

      res.status(200).json({ data: result.rows });
    }

    else if (req.method === "POST") {
      const body = req.body;

      const result = await db.execute({
        sql: `
          INSERT INTO hr_employees 
            (first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          body.first_name,
          body.last_name,
          body.gender,
          body.date_of_birth,
          body.department,
          body.hire_date,
          body.status || "Active",
          body.salary_grade,
          body.tpin,
          body.pacra_number
        ]
      });

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    }

    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("❌ Error in /api/hr/employees:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
}
