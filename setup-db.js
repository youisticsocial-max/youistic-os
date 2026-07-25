const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_5oFXVn4vNQtP@ep-gentle-mud-azrppicb.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  });

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
    console.error('Error creating schema:', err);
  } finally {
    await client.end();
  }
}

main();
