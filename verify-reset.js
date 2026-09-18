require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is missing.");
  process.exit(1);
}

async function verify() {
  let hostname = "target DB";
  try {
    hostname = new URL(connectionString).hostname;
  } catch (e) {}

  console.log(`Verifying table record counts on host: ${hostname}...`);
  const client = new Client({ connectionString });
  
  try {
    await client.connect();

    const tables = ['clients', 'leads', 'projects', 'tasks', 'support_tickets', 'revenue_entries'];
    for (const t of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
        console.log(`${t} count:`, res.rows[0].count);
      } catch (err) {
        console.log(`${t} table error:`, err.message);
      }
    }
  } catch (err) {
    console.error("Verification error:", err.message);
  } finally {
    await client.end();
  }
}

verify();
