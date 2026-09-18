require('dotenv').config();
const { Client } = require('pg');

/**
 * DEPRECATED / HIGH-RISK UTILITY SCRIPT
 * This script deletes all business data from the target database.
 * DO NOT RUN AGAINST PRODUCTION DATABASES.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("CRITICAL ERROR: DATABASE_URL environment variable is missing.");
  console.error("Execution aborted.");
  process.exit(1);
}

if (process.env.ALLOW_DATABASE_RESET !== "YES_I_UNDERSTAND") {
  console.error("=========================================================================");
  console.error("DANGER: reset-database.js is a DESTRUCTIVE script that deletes all data!");
  console.error("Execution blocked by default.");
  console.error("To proceed, you MUST set the environment variable:");
  console.error("  ALLOW_DATABASE_RESET=YES_I_UNDERSTAND");
  console.error("=========================================================================");
  process.exit(1);
}

async function resetAllData() {
  let hostname = "target DB";
  let dbname = "";
  try {
    const parsed = new URL(connectionString);
    hostname = parsed.hostname;
    dbname = parsed.pathname.replace(/^\//, '');
  } catch (e) {}

  console.log(`WARNING: Resetting all data on host: ${hostname}, DB: ${dbname}...`);
  
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database...');

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

    console.log('Reset complete.');
  } catch (err) {
    console.error('Error during database reset:', err.message);
  } finally {
    await client.end();
  }
}

resetAllData();
