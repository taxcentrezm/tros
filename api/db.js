// api/_db.js
const { Pool } = require("pg");

let pool;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  // For many managed Postgres providers (Heroku, Railway, Supabase) you might
  // need SSL in production. Adjust as required by your provider.
  const opts = {
    connectionString,
  };

  if (process.env.NODE_ENV === "production") {
    // If your DB requires SSL (most hosted DBs require rejectUnauthorized: false)
    opts.ssl = { rejectUnauthorized: false };
  }

  pool = new Pool(opts);
  return pool;
}

module.exports = { getPool };
