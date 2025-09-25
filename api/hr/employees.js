// api/hr/employees.js
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // ✅ Fetch employees
      const result = await client.execute(`
        SELECT employee_id, first_name, last_name, tpin, pacra_number, department, status, hire_date
        FROM hr_employees
        ORDER BY employee_id
      `);

      return res.status(200).json({ data: result.rows });
    }

    if (req.method === "POST") {
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

      await client.execute({
        sql: `
          INSERT INTO hr_employees 
            (first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
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
        ],
      });

      return res.status(201).json({ message: "✅ Employee added successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/hr/employees:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
