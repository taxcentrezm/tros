import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://taxcrwlh_admin:l26Nj!+?Fr0l@your-db-host:5432/taxcrwlh_tros",
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { employee_id, loan_amount, interest_rate, months, monthly_installment, total_payment, total_interest, eligibility } = req.body;

      const result = await pool.query(
        `INSERT INTO payroll.loans 
         (employee_id, loan_amount, interest_rate, months, monthly_installment, total_payment, total_interest, eligibility) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) 
         RETURNING loan_id`,
        [employee_id, loan_amount, interest_rate, months, monthly_installment, total_payment, total_interest, eligibility]
      );

      res.status(201).json({ message: "Loan saved", loan_id: result.rows[0].loan_id });
    } catch (err) {
      console.error("Error inserting loan:", err);
      res.status(500).json({ error: "Database error" });
    }
  } else if (req.method === "GET") {
    try {
      const result = await pool.query(`
        SELECT l.loan_id, e.first_name, e.last_name, l.loan_amount, l.monthly_installment, l.months, l.eligibility, l.created_at
        FROM payroll.loans l
        JOIN hr.employees e ON l.employee_id = e.employee_id
        ORDER BY l.created_at DESC
      `);
      res.status(200).json({ data: result.rows });
    } catch (err) {
      console.error("Error fetching loans:", err);
      res.status(500).json({ error: "Database error" });
    }
  } else {
    res.setHeader("Allow", ["GET","POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
