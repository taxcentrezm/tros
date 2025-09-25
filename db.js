// db.js
import { createClient } from "@libsql/client";

// Turso (SQLite over HTTP) connection
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Example query wrapper
export async function query(sql, params = []) {
  try {
    const result = await db.execute({
      sql,
      args: params,
    });
    return result.rows;
  } catch (err) {
    console.error("❌ DB query error:", err);
    throw err;
  }
}
