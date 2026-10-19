const { Pool } = require("pg");

// Connection details come from environment variables set in docker-compose.yml.
// DB_HOST is the compose service name of the database container ("db").
const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppassword",
  database: process.env.DB_NAME || "appdb",
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wait until Postgres accepts connections, then create the table if needed.
async function initDb(retries = 20, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          done BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log("Database ready");
      return;
    } catch (err) {
      console.log(
        `Database not ready (attempt ${attempt}/${retries}): ${err.message}`
      );
      await sleep(delayMs);
    }
  }
  throw new Error("Could not connect to the database");
}

module.exports = { pool, initDb };
