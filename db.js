// db.js
import { createClient } from "@libsql/client";

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  // 👇 Disable migrations, only run raw SQL
  syncUrl: undefined,
  syncInterval: 0,
});
