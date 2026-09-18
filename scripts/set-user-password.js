/**
 * One-Time Admin User Password Initialization Utility
 * Safely hashes and persists user password directly in PostgreSQL without committing credentials.
 *
 * Usage:
 *   TARGET_EMAIL="ceo@youistic.com" NEW_PASSWORD="your-strong-password" npm run auth:set-password
 *   OR:
 *   npm run auth:set-password -- user@youistic.com "your-strong-password"
 *
 * DO NOT RUN AUTOMATICALLY ON BUILD OR DEPLOYMENT.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const email = process.env.TARGET_EMAIL || process.argv[2];
  const password = process.env.NEW_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error("Error: Missing required target user email or password.");
    console.log("\nUsage:");
    console.log('  TARGET_EMAIL="user@youistic.com" NEW_PASSWORD="secretpassword" npm run auth:set-password');
    console.log('  OR: npm run auth:set-password -- user@youistic.com "secretpassword"\n');
    process.exit(1);
  }

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  if (trimmedPassword.length < 6) {
    console.error("Error: Password must be at least 6 characters long.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmedEmail, mode: "insensitive" } },
    });

    if (!user) {
      console.error(`Error: User with email '${trimmedEmail}' not found in database.`);
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(trimmedPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log(`[SUCCESS] Initialized secure bcrypt password hash for user '${user.name}' (${user.email}).`);
  } catch (error) {
    console.error("[ERROR] Failed to set user password:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
