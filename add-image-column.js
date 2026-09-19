require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is missing.");
  process.exit(1);
}

if (process.env.ALLOW_SCHEMA_MUTATION !== "YES") {
  console.error("WARNING: add-image-column.js modifies database schema!");
  console.error("Execution blocked. To run this script, set environment variable ALLOW_SCHEMA_MUTATION=YES");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    console.log("Adding imageUrl to leads table...");
    await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;');
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

main();
