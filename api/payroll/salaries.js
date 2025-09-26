// api/payroll/salaries.js
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Fetch salary structures with employee details
      const result = await client.execute(`
        SELECT 
          s.salary_id,
          s.employee_id,
          e.first_name,
          e.last_name,
          s.effective_date,
          s.basic,
          s.housing,
          s.transport,
          s.bonus
        FROM payroll_salary_structures s
        JOIN hr_employees e ON s.employee_id = e.employee_id
        ORDER BY s.effective_date DESC
      `);

      return res.status(200).json({ data: result.rows });
    }

    if (req.method === "POST") {
      const {
        employee_id,
        effective_date,
        basic,
        housing,
        transport,
        bonus,
      } = req.body;

      await client.execute({
        sql: `
          INSERT INTO payroll_salary_structures 
            (employee_id, effective_date, basic, housing, transport, bonus)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(employee_id, effective_date) DO UPDATE SET
            basic = excluded.basic,
            housing = excluded.housing,
            transport = excluded.transport,
            bonus = excluded.bonus
        `,
        args: [employee_id, effective_date, basic, housing, transport, bonus],
      });

      return res.status(201).json({ message: "✅ Salary structure saved" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/payroll/salaries:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
