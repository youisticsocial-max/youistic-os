require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is not defined.");
  console.error("Please set DATABASE_URL in your environment or .env file.");
  process.exit(1);
}

try {
  const parsed = new URL(connectionString);
  console.log(`Testing Prisma adapter connection to host: ${parsed.hostname}`);
} catch (e) {
  console.log("Testing Prisma connection using DATABASE_URL...");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const leadCount = await prisma.lead.count();
    console.log(`Prisma connected with Adapter! Total leads count: ${leadCount}`);
  } catch (err) {
    console.error('Prisma connection failed:', err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
