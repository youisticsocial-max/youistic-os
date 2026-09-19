require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is missing.");
  process.exit(1);
}

if (process.env.ALLOW_SCHEMA_MUTATION !== "YES") {
  console.error("WARNING: setup-db.js modifies database schema!");
  console.error("Execution blocked. To run this script, set environment variable ALLOW_SCHEMA_MUTATION=YES");
  process.exit(1);
}

async function main() {
  let hostname = "target DB";
  try {
    hostname = new URL(connectionString).hostname;
  } catch (e) {}

  console.log(`Executing schema setup on host: ${hostname}...`);

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to DB');

    let sql = fs.readFileSync('schema_utf8.sql', 'utf8');
    if (sql.charCodeAt(0) === 0xFEFF) {
      sql = sql.slice(1);
    }
    await client.query(sql);
    console.log('Schema created successfully!');

  } catch (err) {
    console.error('Error creating schema:', err.message);
  } finally {
    await client.end();
  }
}

main();
