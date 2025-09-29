// lib/db.js
import { createClient } from "@libsql/client/web";

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
