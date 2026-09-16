import { CronExpressionParser } from "cron-parser";

export function computeNextRunAt(args: {
  scheduleType: string;
  runAt?: Date | null;
  cronExpr?: string | null;
  timezone?: string;
  from?: Date;
}): Date | null {
  const from = args.from ?? new Date();
  if (args.scheduleType === "once") {
    return args.runAt ?? null;
  }
  if (!args.cronExpr) return null;
  try {
    const expression = CronExpressionParser.parse(args.cronExpr, {
      currentDate: from,
      tz: args.timezone || "UTC",
    });
    return expression.next().toDate();
  } catch {
    return null;
  }
}
