export type ScheduleType = "once" | "cron";
export type HandlerType = "reminder";

export type ParsedJob = {
  title: string;
  scheduleType: ScheduleType;
  runAt: string | null;
  cronExpr: string | null;
  handler: HandlerType;
  timezone: string;
  notes?: string;
};

const DAY_CRON: Record<string, string> = {
  sunday: "0 9 * * 0",
  monday: "0 9 * * 1",
  tuesday: "0 9 * * 2",
  wednesday: "0 9 * * 3",
  thursday: "0 9 * * 4",
  friday: "0 9 * * 5",
  saturday: "0 9 * * 6",
};

function cleanTitle(prompt: string): string {
  let t = prompt.trim();
  t = t.replace(/^please\s+/i, "");
  t = t.replace(/^remind me\s+/i, "");
  t = t.replace(/^in\s+\d+\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\s+/i, "");
  t = t.replace(/^every\s+(day|week|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+/i, "");
  t = t.replace(/^(daily|weekly)\s+/i, "");
  t = t.replace(/^to\s+/i, "");
  t = t.replace(/^that\s+/i, "");
  return t.trim() || prompt.trim();
}

export function parseHeuristic(prompt: string, now = new Date()): ParsedJob {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const title = cleanTitle(text);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const inMatch = lower.match(
    /\bin\s+(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b/
  );
  if (inMatch) {
    const amount = Number(inMatch[1]);
    const unit = inMatch[2];
    const runAt = new Date(now);
    if (unit.startsWith("min")) runAt.setMinutes(runAt.getMinutes() + amount);
    else if (unit.startsWith("hour") || unit.startsWith("hr"))
      runAt.setHours(runAt.getHours() + amount);
    else runAt.setDate(runAt.getDate() + amount);
    return {
      title,
      scheduleType: "once",
      runAt: runAt.toISOString(),
      cronExpr: null,
      handler: "reminder",
      timezone,
      notes: "Parsed with local heuristics",
    };
  }

  if (/\bevery\s+day\b|\bdaily\b/.test(lower)) {
    return {
      title,
      scheduleType: "cron",
      runAt: null,
      cronExpr: "0 9 * * *",
      handler: "reminder",
      timezone,
      notes: "Daily at 09:00",
    };
  }

  if (/\bevery\s+week\b|\bweekly\b/.test(lower)) {
    return {
      title,
      scheduleType: "cron",
      runAt: null,
      cronExpr: "0 9 * * 1",
      handler: "reminder",
      timezone,
      notes: "Weekly on Monday at 09:00",
    };
  }

  for (const [day, cronExpr] of Object.entries(DAY_CRON)) {
    if (new RegExp(`\\bevery\\s+${day}\\b`).test(lower) || new RegExp(`\\bon\\s+${day}s?\\b`).test(lower)) {
      return {
        title,
        scheduleType: "cron",
        runAt: null,
        cronExpr,
        handler: "reminder",
        timezone,
        notes: `Every ${day} at 09:00`,
      };
    }
  }

  // Default: one-shot in 1 hour
  const runAt = new Date(now);
  runAt.setHours(runAt.getHours() + 1);
  return {
    title,
    scheduleType: "once",
    runAt: runAt.toISOString(),
    cronExpr: null,
    handler: "reminder",
    timezone,
    notes: "No schedule found — defaulting to once in 1 hour",
  };
}

export async function parseWithOpenAI(prompt: string): Promise<ParsedJob | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const nowIso = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const system = `You convert natural language automation requests into JSON for a job scheduler.
Return ONLY valid JSON with keys:
title (string), scheduleType ("once"|"cron"), runAt (ISO string or null),
cronExpr (5-field cron or null), handler ("reminder"), timezone (IANA string), notes (string).
Current time is ${nowIso}. User timezone is ${timezone}.
Prefer cron for recurring ("every Friday") and once for relative times ("in 10 minutes").
Default handler is reminder. Default daily/weekly time is 09:00 local.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content) as ParsedJob;
  return {
    title: parsed.title || cleanTitle(prompt),
    scheduleType: parsed.scheduleType === "cron" ? "cron" : "once",
    runAt: parsed.runAt ?? null,
    cronExpr: parsed.cronExpr ?? null,
    handler: "reminder",
    timezone: parsed.timezone || timezone,
    notes: parsed.notes || "Parsed with OpenAI",
  };
}

export async function parsePrompt(prompt: string): Promise<ParsedJob> {
  try {
    const llm = await parseWithOpenAI(prompt);
    if (llm) return llm;
  } catch {
    // Fall through to heuristics
  }
  return parseHeuristic(prompt);
}
