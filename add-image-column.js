const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Adding imageUrl to leads table...");
    await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;');
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
