const { Client } = require('pg');

async function resetAllData() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5oFXVn4vNQtP@ep-gentle-mud-azrppicb.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connecting to Neon PostgreSQL Database...');

    // Delete in reverse order of foreign key dependencies
    const tablesToClean = [
      'revenue_entries',
      'expense_entries',
      'tasks',
      'projects',
      'ticket_comments',
      'support_tickets',
      'deals',
      'meetings',
      'client_assets',
      'leads',
      'clients',
      'daily_reports',
      'performance_metrics',
    ];

    for (const table of tablesToClean) {
      try {
        await client.query(`DELETE FROM "${table}"`);
        console.log(`Cleared table: ${table}`);
      } catch (err) {
        console.log(`Notice for table ${table}: ${err.message}`);
      }
    }

    console.log('Successfully reset all data in database to 0!');
  } catch (err) {
    console.error('Error during database reset:', err);
  } finally {
    await client.end();
  }
}

resetAllData();
