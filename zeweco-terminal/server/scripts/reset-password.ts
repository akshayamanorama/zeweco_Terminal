/**
 * Reset CXO/Manager password
 * Run: npx ts-node scripts/reset-password.ts akshaya@zeweco.com newpassword
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: npx ts-node scripts/reset-password.ts <email> <new-password>');
    console.error('Example: npx ts-node scripts/reset-password.ts akshaya@zeweco.com MyNewPass123');
    process.exit(1);
  }

  const user = await prisma.user.updateMany({
    where: { email },
    data: { password: newPassword },
  });

  if (user.count === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Password reset for ${email}. You can now log in with the new password.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
