# Personal AI Task Automator

Turn natural-language requests into scheduled reminder jobs. A Next.js dashboard parses prompts; a local worker runs due jobs and stores history in SQLite.

## Stack

- **apps/web** — Next.js App Router UI + API
- **apps/worker** — polling job runner
- **packages/db** — Prisma + SQLite

## Setup

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy [`.env.example`](.env.example) to `.env` if needed. Set `OPENAI_API_KEY` for LLM parsing; without it, a local heuristic parser is used.

SQLite file: `packages/db/dev.db` (created by `npm run db:push`).

## Sample prompts

- `remind me in 2 minutes to stand up`
- `remind me every Friday to review expenses`
- `every day review inbox`
- `every week plan meals`

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Web + worker together |
| `npm run worker` | Worker only |
| `npm run db:push` | Apply Prisma schema to SQLite |
| `npm run db:generate` | Regenerate Prisma client |

## How it works

1. Enter a prompt → **Parse** (OpenAI if configured, else heuristics).
2. Edit title/schedule if needed → **Create job**.
3. Worker polls every ~15s, runs due `reminder` jobs, writes `JobRun` rows, disables completed one-shots, and advances cron `nextRunAt`.

## MVP scope

Single-user, reminder handler only. No auth, email/Slack, or Redis.
