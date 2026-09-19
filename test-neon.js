require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is not defined.");
  console.error("Please set DATABASE_URL in your environment or .env file.");
  process.exit(1);
}

try {
  const parsed = new URL(connectionString);
  console.log(`Testing connection to host: ${parsed.hostname}, database: ${parsed.pathname.replace(/^\//, '')}`);
} catch (e) {
  console.log("Testing connection using DATABASE_URL...");
}

const client = new Client({ connectionString });

client.connect()
  .then(() => {
    console.log('Connected to database successfully using pg module!');
    client.end();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  });
