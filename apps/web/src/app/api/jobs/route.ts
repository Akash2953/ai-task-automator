import { NextResponse } from "next/server";
import { prisma } from "@ata/db";
import { parsePrompt } from "@/lib/parser";
import { computeNextRunAt } from "@/lib/schedule";

export const runtime = "nodejs";

export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
  });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    prompt?: string;
    title?: string;
    scheduleType?: "once" | "cron";
    runAt?: string | null;
    cronExpr?: string | null;
    timezone?: string;
    handler?: string;
    parseOnly?: boolean;
  };

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const parsed = await parsePrompt(prompt);

  const title = body.title?.trim() || parsed.title;
  const scheduleType = body.scheduleType || parsed.scheduleType;
  const cronExpr =
    scheduleType === "cron" ? body.cronExpr ?? parsed.cronExpr : null;
  const runAtRaw =
    scheduleType === "once" ? body.runAt ?? parsed.runAt : null;
  const runAt = runAtRaw ? new Date(runAtRaw) : null;
  const timezone = body.timezone || parsed.timezone || "UTC";
  const handler = body.handler || parsed.handler || "reminder";

  if (scheduleType === "once" && (!runAt || Number.isNaN(runAt.getTime()))) {
    return NextResponse.json(
      { error: "runAt is required for one-shot jobs" },
      { status: 400 }
    );
  }
  if (scheduleType === "cron" && !cronExpr) {
    return NextResponse.json(
      { error: "cronExpr is required for recurring jobs" },
      { status: 400 }
    );
  }

  const nextRunAt = computeNextRunAt({
    scheduleType,
    runAt,
    cronExpr,
    timezone,
  });

  if (body.parseOnly) {
    return NextResponse.json({
      parsed: {
        title,
        scheduleType,
        runAt: runAt?.toISOString() ?? null,
        cronExpr,
        timezone,
        handler,
        nextRunAt: nextRunAt?.toISOString() ?? null,
        notes: parsed.notes,
      },
    });
  }

  const job = await prisma.job.create({
    data: {
      title,
      prompt,
      scheduleType,
      runAt,
      cronExpr,
      nextRunAt,
      timezone,
      enabled: true,
      handler,
      payload: JSON.stringify({ source: "nl" }),
      lastStatus: null,
    },
  });

  return NextResponse.json({ job, notes: parsed.notes }, { status: 201 });
}
