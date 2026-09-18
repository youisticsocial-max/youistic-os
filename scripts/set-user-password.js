/**
 * One-Time Admin User Password Initialization Utility
 * Safely prompts interactively for a new password and persists bcrypt hash directly in PostgreSQL.
 * Passwords are NOT accepted as command-line arguments to prevent leakage in shell history.
 *
 * Usage:
 *   npm run auth:set-password -- user@youistic.com
 *   OR:
 *   TARGET_EMAIL="user@youistic.com" npm run auth:set-password
 *
 * DO NOT RUN AUTOMATICALLY ON BUILD OR DEPLOYMENT.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const readline = require("readline");

function promptPassword(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Mute stdout while typing password to avoid echoing in terminal
    let muted = false;
    const oldWrite = process.stdout.write;
    process.stdout.write = function (string, encoding, fd) {
      if (muted) {
        if (string === "\n" || string === "\r\n" || string === "\r") {
          return oldWrite.call(process.stdout, "\n", encoding, fd);
        }
        return oldWrite.call(process.stdout, "*", encoding, fd);
      }
      return oldWrite.call(process.stdout, string, encoding, fd);
    };

    process.stdout.write(query);
    muted = true;

    rl.question("", (answer) => {
      muted = false;
      process.stdout.write = oldWrite;
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const email = process.env.TARGET_EMAIL || process.argv[2];

  if (!email || !email.trim()) {
    console.error("Error: Target user email is required.");
    console.log("\nUsage:");
    console.log("  npm run auth:set-password -- user@youistic.com");
    console.log('  OR: TARGET_EMAIL="user@youistic.com" npm run auth:set-password\n');
    process.exit(1);
  }

  const trimmedEmail = email.trim();

  // Prompt interactively for password
  const password = await promptPassword("Enter new password (min 12 chars): ");
  const confirmPassword = await promptPassword("Confirm new password: ");

  if (password !== confirmPassword) {
    console.error("\nError: Passwords do not match.");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("\nError: Password must be at least 12 characters long.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmedEmail, mode: "insensitive" } },
    });

    if (!user) {
      console.error(`\nError: User with email '${trimmedEmail}' not found in database.`);
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });

    console.log(`\n[SUCCESS] Initialized secure bcrypt password hash for user '${user.name}' (${user.email}).`);
  } catch (error) {
    console.error("\n[ERROR] Failed to set user password:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
