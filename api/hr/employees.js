export default async function handler(req, res) {
  // ✅ Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    // fetch from Postgres and return rows
    const result = await pool.query("SELECT * FROM hr.employees");
    return res.status(200).json({ data: result.rows });
  }

  if (req.method === "POST") {
    const {
      first_name, last_name, gender, date_of_birth,
      department, hire_date, status, salary_grade,
      tpin, pacra_number
    } = req.body;

    const result = await pool.query(
      `INSERT INTO hr.employees 
      (first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [first_name, last_name, gender, date_of_birth, department, hire_date, status, salary_grade, tpin, pacra_number]
    );

    return res.status(201).json({ data: result.rows[0] });
  }
}
