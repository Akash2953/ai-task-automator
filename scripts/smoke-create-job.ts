import { prisma } from "@ata/db";

async function main() {
  console.log("DATABASE_URL=", process.env.DATABASE_URL);
  const runAt = new Date(Date.now() - 1000);
  const job = await prisma.job.create({
    data: {
      title: "Smoke test reminder",
      prompt: "remind me in 1 minutes to smoke test",
      scheduleType: "once",
      runAt,
      nextRunAt: runAt,
      timezone: "UTC",
      enabled: true,
      handler: "reminder",
    },
  });
  console.log("created", job.id);
  const count = await prisma.job.count();
  console.log("job count", count);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
