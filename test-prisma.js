const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = 'postgresql://neondb_owner:npg_5oFXVn4vNQtP@ep-gentle-mud-azrppicb-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const leads = await prisma.lead.findMany();
    console.log('Prisma connected with Adapter! Leads:', leads);
  } catch (err) {
    console.error('Prisma connection failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
