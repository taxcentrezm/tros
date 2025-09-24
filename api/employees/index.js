// api/employees/index.js
const { getPool } = require("../_db");

// Vercel serverless function style: export default (req, res) => { ... }
module.exports = async (req, res) => {
  // allow basic CORS for same-origin deployments or cross-origin frontends
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const pool = getPool();
    const q = `
      SELECT
        employee_id,
        first_name,
        last_name,
        tpin,
        pacra_number
      FROM hr.employees
      ORDER BY first_name, last_name
      LIMIT 1000;
    `;
    const { rows } = await pool.query(q);
    // Normalize field names for the front-end
    const data = rows.map(r => ({
      employee_id: r.employee_id,
      first_name: r.first_name,
      last_name: r.last_name,
      tpin: r.tpin,
      pacra: r.pacra_number
    }));
    return res.status(200).json({ data });
  } catch (err) {
    console.error("employees API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
