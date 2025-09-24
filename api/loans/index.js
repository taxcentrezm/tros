// api/loans/index.js
const { getPool } = require("../_db");

// Helper: calculates installment and totals, same formula as your front-end
function calculateLoan(loanAmount, annualRatePercent, months) {
  const rate = (Number(annualRatePercent) || 0) / 100;
  const monthlyRate = rate / 12;
  let monthlyInstallment = 0;

  if (monthlyRate === 0) {
    monthlyInstallment = loanAmount / months;
  } else {
    monthlyInstallment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  }

  const totalPayment = monthlyInstallment * months;
  const totalInterest = totalPayment - loanAmount;

  return {
    monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
    totalPayment: Number(totalPayment.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    monthlyRate
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const pool = getPool();

    if (req.method === "GET") {
      // optionally filter by employee_id: /api/loans?employee_id=123
      const employeeId = req.query.employee_id;
      const params = [];
      let q = `
        SELECT loan_id, employee_id, loan_amount, interest_rate, months,
               monthly_installment, total_payment, total_interest, eligibility, created_at
        FROM payroll.loans
      `;
      if (employeeId) {
        params.push(employeeId);
        q += ` WHERE employee_id = $1`;
      }
      q += ` ORDER BY created_at DESC LIMIT 500;`;
      const { rows } = await pool.query(q, params);
      return res.status(200).json({ data: rows });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Required fields and validation
      const {
        employee_id,
        loan_amount,
        interest_rate, // percent value, e.g. 12.5
        months,
        // optional: monthly_installment, total_payment, total_interest, eligibility — we will recalc
      } = body || {};

      if (!employee_id) {
        return res.status(400).json({ error: "employee_id is required" });
      }
      const loanAmount = Number(loan_amount);
      const annualRate = Number(interest_rate);
      const monthsNum = Number(months);

      if (!loanAmount || loanAmount <= 0) {
        return res.status(400).json({ error: "loan_amount must be a positive number" });
      }
      if (!Number.isFinite(annualRate) || annualRate < 0) {
        return res.status(400).json({ error: "interest_rate must be >= 0" });
      }
      if (!Number.isInteger(monthsNum) || monthsNum <= 0) {
        return res.status(400).json({ error: "months must be a positive integer" });
      }

      // verify employee exists
      const empQ = "SELECT employee_id FROM hr.employees WHERE employee_id = $1 LIMIT 1";
      const empRes = await pool.query(empQ, [employee_id]);
      if (empRes.rowCount === 0) {
        return res.status(400).json({ error: "employee_id not found" });
      }

      // re-calculate on server
      const { monthlyInstallment, totalPayment, totalInterest } = calculateLoan(loanAmount, annualRate, monthsNum);

      // For eligibility policy: decide server-side criteria.
      // We'll use same rule as front-end: installment <= 40% of employee's net pay.
      // To do that we need net pay value — since hr.employees may not contain net pay,
      // you can adjust this to use payroll.salaries or pass net pay with request.
      // For now we'll attempt to get latest net pay from payroll.salaries (if exists).
      let eligibility = null;
      try {
        // Example: payroll.salaries table with employee_id, gross, net, paid_at
        const payQ = `
          SELECT net
          FROM payroll.salaries
          WHERE employee_id = $1
          ORDER BY paid_at DESC
          LIMIT 1;
        `;
        const payRes = await pool.query(payQ, [employee_id]);
        if (payRes.rowCount > 0 && payRes.rows[0].net != null) {
          const netPay = Number(payRes.rows[0].net);
          eligibility = monthlyInstallment <= (netPay * 0.4);
        } else {
          // fallback: if payroll.salaries not present / data missing, mark eligibility null
          eligibility = null;
        }
      } catch (e) {
        // If payroll.salaries doesn't exist, we do not fail — just set eligibility null
        eligibility = null;
      }

      // If front-end already computed eligibility and you want to prefer it:
      // eligibility = (typeof body.eligibility === 'boolean') ? body.eligibility : eligibility;

      // Insert into payroll.loans (create table if you haven't already)
      const insertQ = `
        INSERT INTO payroll.loans
          (employee_id, loan_amount, interest_rate, months, monthly_installment, total_payment, total_interest, eligibility, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
        RETURNING loan_id, employee_id, loan_amount, interest_rate, months, monthly_installment, total_payment, total_interest, eligibility, created_at;
      `;
      const insertParams = [
        employee_id,
        loanAmount,
        annualRate,
        monthsNum,
        monthlyInstallment,
        totalPayment,
        totalInterest,
        eligibility
      ];

      const insertRes = await pool.query(insertQ, insertParams);

      return res.status(201).json({ data: insertRes.rows[0] });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("loans API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
