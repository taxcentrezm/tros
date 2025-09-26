// db.js
import { createClient } from "@libsql/client";

// ✅ Create Turso client without migration sync
export const client = createClient({
  url: process.env.TURSO_DATABASE_URL,     // e.g. "https://your-db.turso.io"
  authToken: process.env.TURSO_AUTH_TOKEN, // set in Vercel environment variables
  // 🚫 disable migrations
  syncUrl: undefined,
  syncInterval: 0,
});

// Quick connection test (runs only locally)
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      await client.execute("SELECT 1;");
      console.log("✅ Turso DB connected");
    } catch (err) {
      console.error("❌ Turso DB connection failed:", err.message);
    }
  })();
}
