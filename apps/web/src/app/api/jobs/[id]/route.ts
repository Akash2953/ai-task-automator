import { NextResponse } from "next/server";
import { prisma } from "@ata/db";
import { computeNextRunAt } from "@/lib/schedule";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { enabled?: boolean };

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const enabled = body.enabled ?? existing.enabled;
  let nextRunAt = existing.nextRunAt;

  if (enabled && !existing.enabled) {
    nextRunAt = computeNextRunAt({
      scheduleType: existing.scheduleType,
      runAt: existing.runAt,
      cronExpr: existing.cronExpr,
      timezone: existing.timezone,
    });
  }

  const job = await prisma.job.update({
    where: { id },
    data: { enabled, nextRunAt },
  });

  return NextResponse.json({ job });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
