const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const schedules = await prisma.schedule.findMany({ include: { game: true, video: true } });
  console.log(JSON.stringify(schedules, null, 2));
}
main().finally(() => prisma.$disconnect());
