import { client } from "../../db.js";

function calculateDeductions({ basic = 0, housing = 0, transport = 0, bonus = 0, loan_deduction = 0 }) {
  const gross = basic + housing + transport + bonus;
  let taxable = gross;
  let paye = 0;

  if (taxable > 9200) {
    paye += (taxable - 9200) * 0.37;
    taxable = 9200;
  }
  if (taxable > 7100) {
    paye += (taxable - 7100) * 0.30;
    taxable = 7100;
  }
  if (taxable > 5100) {
    paye += (taxable - 5100) * 0.20;
    taxable = 5100;
  }

  const napsa = gross * 0.05;
  const nhima = gross * 0.01;
  const net = gross - (paye + napsa + nhima + loan_deduction);

  return { gross, net, paye, napsa, nhima };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const salaries = await client.execute(`
        SELECT salary_id, department, basic, housing, transport, bonus, effective_date
        FROM salaries
        ORDER BY department
      `);

      const records = await client.execute(`
        SELECT * FROM payroll_records
        ORDER BY created_at DESC
      `);

      const periods = await client.execute(`
        SELECT period_id, period_year, period_month, start_date, end_date
        FROM payroll_periods
        ORDER BY start_date DESC
      `);

      return res.status(200).json({
        salaries: Array.isArray(salaries.rows) ? salaries.rows : [],
        records: Array.isArray(records.rows) ? records.rows : [],
        periods: Array.isArray(periods.rows) ? periods.rows : []
      });
    }

    if (req.method === "POST") {
      const {
        period_year,
        period_month,
        start_date,
        end_date,
        employee_id,
        department,
        basic,
        housing,
        transport,
        bonus,
        loan,
        effective_date,
        period_id
      } = req.body;

      // ✅ Admin: Create new payroll period
      if (period_year && period_month && start_date && end_date) {
        const existing = await client.execute({
          sql: `
            SELECT period_id FROM payroll_periods
            WHERE period_year = ? AND period_month = ?
            LIMIT 1
          `,
          args: [period_year, period_month]
        });

        if (existing.rows.length > 0) {
          return res.status(409).json({ error: "❌ Period already exists for this year and month" });
        }

        await client.execute({
          sql: `
            INSERT INTO payroll_periods (period_year, period_month, start_date, end_date)
            VALUES (?, ?, ?, ?)
          `,
          args: [period_year, period_month, start_date, end_date]
        });

        return res.status(201).json({ message: "✅ Payroll period created" });
      }

      // ✅ Validate required fields for payroll record
      if (!employee_id || !period_id || !department || !effective_date) {
        return res.status(400).json({ error: "Missing required payroll fields" });
      }

      // ✅ Save department-level salary structure
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
        args: [department, basic, housing, transport, bonus, effective_date]
      });

      const { gross, net, paye, napsa, nhima } = calculateDeductions({
        basic,
        housing,
        transport,
        bonus,
        loan_deduction: loan
      });

      await client.execute({
        sql: `
          INSERT INTO payroll_records 
          (employee_id, period_id, basic, housing, transport, bonus, loan_deduction, gross, net, paye, napsa, nhima, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        args: [employee_id, period_id, basic, housing, transport, bonus, loan, gross, net, paye, napsa, nhima]
      });

      return res.status(201).json({ message: "✅ Salary structure and payroll record saved" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Error in /api/payroll/salaries:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
}
