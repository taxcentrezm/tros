const { getPool } = require("../_db");

// Helper: calculate loan breakdown
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

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const pool = getPool();

    if (req.method === "GET") {
      const employeeId = req.query.employee_id;
      const params = [];
      let q = `
        SELECT loan_id, employee_id, loan_amount, interest_rate, months,
               monthly_installment, total_payment, total_interest, eligibility, created_at
        FROM payroll_loans
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
      const {
        employee_id,
        loan_amount,
        interest_rate,
        months,
        schedule // optional: frontend-calculated schedule
      } = body || {};

      if (!employee_id || !loan_amount || !interest_rate || !months) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const loanAmount = Number(loan_amount);
      const annualRate = Number(interest_rate);
      const monthsNum = Number(months);

      if (!loanAmount || loanAmount <= 0) return res.status(400).json({ error: "Invalid loan amount" });
      if (!Number.isFinite(annualRate) || annualRate < 0) return res.status(400).json({ error: "Invalid interest rate" });
      if (!Number.isInteger(monthsNum) || monthsNum <= 0) return res.status(400).json({ error: "Invalid months value" });

      const empCheck = await pool.query("SELECT employee_id FROM hr_employees WHERE employee_id = $1 LIMIT 1", [employee_id]);
      if (empCheck.rowCount === 0) return res.status(400).json({ error: "Employee not found" });

      const { monthlyInstallment, totalPayment, totalInterest, monthlyRate } = calculateLoan(loanAmount, annualRate, monthsNum);

      let eligibility = null;
      try {
        const payRes = await pool.query(`
          SELECT net FROM salaries
          WHERE employee_id = $1
          ORDER BY paid_at DESC LIMIT 1
        `, [employee_id]);
        if (payRes.rowCount > 0 && payRes.rows[0].net != null) {
          const netPay = Number(payRes.rows[0].net);
          eligibility = monthlyInstallment <= (netPay * 0.4);
        }
      } catch (e) {
        eligibility = null;
      }

      const insertLoan = await pool.query(`
        INSERT INTO loans (
          employee_id, loan_amount, interest_rate, months,
          monthly_installment, total_payment, total_interest, eligibility, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
        RETURNING loan_id
      `, [
        employee_id,
        loanAmount,
        annualRate,
        monthsNum,
        monthlyInstallment,
        totalPayment,
        totalInterest,
        eligibility
      ]);

      const loan_id = insertLoan.rows[0].loan_id;

      // Insert schedule
      const scheduleRows = schedule && Array.isArray(schedule) ? schedule : [];
      if (scheduleRows.length === 0) {
        let balance = loanAmount;
        for (let i = 1; i <= monthsNum; i++) {
          const interest = balance * monthlyRate;
          const principal = monthlyInstallment - interest;
          balance -= principal;
          scheduleRows.push({
            month: i,
            principal: Number(principal.toFixed(2)),
            interest: Number(interest.toFixed(2)),
            installment: Number(monthlyInstallment.toFixed(2)),
            balance: Number(balance.toFixed(2))
          });
        }
      }

      for (const row of scheduleRows) {
        await pool.query(`
          INSERT INTO loan_schedule (loan_id, month, principal, interest, installment, balance)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          loan_id,
          row.month,
          row.principal,
          row.interest,
          row.installment,
          row.balance
        ]);
      }

      return res.status(201).json({ success: true, loan_id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("loans API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
