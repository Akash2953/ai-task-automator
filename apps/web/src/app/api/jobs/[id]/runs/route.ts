import { NextResponse } from "next/server";
import { prisma } from "@ata/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const runs = await prisma.jobRun.findMany({
    where: { jobId: id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ runs });
}
