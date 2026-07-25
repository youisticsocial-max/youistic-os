const { Client } = require('pg');

async function verify() {
  const connectionString = 'postgresql://neondb_owner:npg_5oFXVn4vNQtP@ep-gentle-mud-azrppicb.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const client = new Client({ connectionString });
  await client.connect();

  const tables = ['clients', 'leads', 'projects', 'tasks', 'support_tickets', 'revenue_entries', 'client_assets'];
  for (const t of tables) {
    const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
    console.log(`${t} count:`, res.rows[0].count);
  }
  await client.end();
}

verify();
