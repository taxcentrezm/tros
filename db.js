// db.js
import { createClient } from "@libsql/client/web"; // ⬅ use the web variant

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL,     // e.g. "https://your-db.turso.io"
  authToken: process.env.TURSO_AUTH_TOKEN, // set in Vercel Environment Variables
});

// Optional local test
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      await client.execute("SELECT 1;");
      console.log("✅ Turso DB connected (web client, no migrations)");
    } catch (err) {
      console.error("❌ Turso DB connection failed:", err.message);
    }
  })();
}
