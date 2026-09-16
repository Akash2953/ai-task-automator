import { prisma, type Job } from "@ata/db";
import { runHandler } from "./handlers";
import { computeNextRunAt } from "./schedule";

const pollMs = Number(process.env.WORKER_POLL_MS || 15000);

let stopping = false;

async function claimDueJobs(now: Date): Promise<Job[]> {
  return prisma.job.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
    },
    orderBy: { nextRunAt: "asc" },
    take: 20,
  });
}

async function processJob(job: Job): Promise<void> {
  const startedAt = new Date();
  try {
    const result = await runHandler(job);
    const finishedAt = new Date();

    await prisma.jobRun.create({
      data: {
        jobId: job.id,
        status: "success",
        startedAt,
        finishedAt,
        message: result.message,
      },
    });

    if (job.scheduleType === "once") {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          enabled: false,
          lastStatus: "success",
          nextRunAt: null,
        },
      });
    } else {
      const nextRunAt = computeNextRunAt({
        scheduleType: job.scheduleType,
        runAt: job.runAt,
        cronExpr: job.cronExpr,
        timezone: job.timezone,
        from: new Date(finishedAt.getTime() + 1000),
      });
      await prisma.job.update({
        where: { id: job.id },
        data: {
          lastStatus: "success",
          nextRunAt,
        },
      });
    }

    console.log(`[ok] ${job.id} ${result.message}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.jobRun.create({
      data: {
        jobId: job.id,
        status: "failed",
        startedAt,
        finishedAt: new Date(),
        error: message,
      },
    });
    await prisma.job.update({
      where: { id: job.id },
      data: { lastStatus: "failed" },
    });
    console.error(`[fail] ${job.id} ${message}`);
  }
}

async function tick(): Promise<void> {
  const now = new Date();
  const due = await claimDueJobs(now);
  for (const job of due) {
    if (stopping) break;
    await processJob(job);
  }
}

async function main() {
  console.log(`AI Task Automator worker started (poll ${pollMs}ms)`);
  console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);
  await tick();
  const timer = setInterval(() => {
    tick().catch((err) => console.error(err));
  }, pollMs);

  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log("Shutting down worker…");
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
