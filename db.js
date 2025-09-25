// db.js
import { createClient } from "@libsql/client";

// ✅ Use environment variables (Vercel Dashboard → Settings → Environment Variables)
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// ✅ Create Turso client
export const client = createClient({
  url,
  authToken,
});

// ✅ Simple test function (runs on startup)
(async () => {
  try {
    const result = await client.execute("SELECT 1 as ok");
    console.log("✅ Turso DB connected:", result.rows);
  } catch (err) {
    console.error("❌ Turso DB connection failed:", err.message);
  }
})();
