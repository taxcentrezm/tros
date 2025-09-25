// db.js
import { createClient } from "@libsql/client";

// Initialize Turso client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL, // e.g. "libsql://your-db.turso.io"
  authToken: process.env.TURSO_AUTH_TOKEN // from Vercel env vars
});

export default db;
