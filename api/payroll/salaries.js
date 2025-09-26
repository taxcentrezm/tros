// 
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await client.execute(`
        SELECT id, department, basic_salary, allowances, bonuses
        FROM payroll_salaries
        ORDER BY department
      `);

      return res.status(200).json({ data: result.rows });
    }

    if (req.method === "POST") {
      const { department, basic_salary, allowances, bonuses } = req.body;

      await client.execute({
        sql: `
          INSERT INTO payroll_salary_structures (department, basic_salary, allowances, bonuses)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(department) DO UPDATE SET
            basic_salary = excluded.basic_salary,
            allowances = excluded.allowances,
            bonuses = excluded.bonuses
        `,
        args: [department, basic_salary, allowances, bonuses],
      });

      return res.status(201).json({ message: "✅ Salary structure saved" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/payroll/salaries:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
