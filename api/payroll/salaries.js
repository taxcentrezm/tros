// api/payroll/salaries.js
import { client } from "../../db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await client.execute(`
        SELECT salary_id, department, basic, housing, transport, bonus, effective_date
        FROM salaries
        ORDER BY department
      `);
      return res.status(200).json({ data: result.rows });
    }

    if (req.method === "POST") {
      const { department, basic, housing, transport, bonus, effective_date } = req.body;

      await client.execute({
        sql: `
          INSERT INTO salaries (department, basic, housing, transport, bonus, effective_date)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(department) DO UPDATE SET
            basic = excluded.basic,
            housing = excluded.housing,
            transport = excluded.transport,
            bonus = excluded.bonus,
            effective_date = excluded.effective_date
        `,
        args: [department, basic, housing, transport, bonus, effective_date],
      });

      return res.status(201).json({ message: "✅ Salary structure saved successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/payroll/salaries:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
