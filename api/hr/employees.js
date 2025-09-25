import express from "express";
import { db } from "../../db.js";

const router = express.Router();

// GET employees
router.get("/", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM hr_employees");
    res.json({ data: result.rows });
  } catch (err) {
    console.error("❌ Error fetching employees:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST new employee
router.post("/", async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, gender, department, hire_date, status, salary_grade, tpin, pacra_number } = req.body;

    await db.execute(
      `INSERT INTO hr_employees 
      (first_name, last_name, date_of_birth, gender, department, hire_date, status, salary_grade, tpin, pacra_number) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, date_of_birth, gender, department, hire_date, status, salary_grade, tpin, pacra_number]
    );

    res.status(201).json({ message: "✅ Employee added successfully" });
  } catch (err) {
    console.error("❌ Error adding employee:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
