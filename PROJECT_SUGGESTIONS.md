# Project suggestions

Workspace is empty. Pick one idea below (or say “go with the recommendation”) and we can scaffold it next.

**Recommended default:** #1 Personal AI Task Automator — matches prior interest in AI automation and is useful day-to-day.

---

## 1. Personal AI Task Automator (recommended)

**Pitch:** Natural-language requests become scheduled or one-shot jobs (reminders, digests, local file tasks).

**Goal fit:** Portfolio + ship a tool you use  
**Stack:** Next.js (App Router) + Node worker + SQLite (better-sqlite3 or Prisma)  
**Why this one:** Clear demo story, practical value, room to grow (integrations, agents).

### MVP scope
- Auth-light local user (or single-user mode)
- Text box: “remind me every Friday to review expenses”
- Parse intent → store job definition (cron / one-shot)
- Worker runs due jobs and writes run history
- Dashboard: jobs list, last run status, enable/disable

### Stretch (after MVP)
- Email/Slack notifications
- File-system actions with confirm step
- LLM tool-calling for richer intents

### First milestone folders
```
apps/web/          # Next.js UI + API routes
apps/worker/       # polls due jobs, executes handlers
packages/db/       # schema + migrations
```

---

## 2. Realtime Chat with Presence

**Pitch:** Rooms, live messages, typing indicators, online presence, message history.

**Goal fit:** Learn fullstack + websockets  
**Stack:** React (Vite or Next) + Socket.IO + Postgres  
**Why:** Classic interview/portfolio signal for realtime systems.

### MVP scope
- Sign in with display name
- Create/join rooms
- Send/receive messages over WebSocket
- Typing + online presence
- Persist messages; load history on join

### Stretch
- DMs, read receipts, file uploads, moderation

### First milestone folders
```
apps/web/          # React client
apps/server/       # HTTP + Socket.IO
packages/db/       # users, rooms, messages
```

---

## 3. Background Job Dashboard

**Pitch:** Enqueue jobs, workers with retries, dead-letter queue, admin UI for status.

**Goal fit:** Learn systems / backend depth  
**Stack:** Node + BullMQ + Redis + simple admin UI (React or Next)  
**Why:** Shows production-minded backend skills.

### MVP scope
- API: enqueue job by type + payload
- Worker processes jobs; configurable retries/backoff
- Failed jobs → dead-letter list
- UI: queue depth, recent jobs, retry/discard DLQ items

### Stretch
- Cron schedules, rate limits, multi-queue priority

### First milestone folders
```
apps/api/          # enqueue + status endpoints
apps/worker/       # BullMQ consumers
apps/admin/        # dashboard UI
```

---

## 4. Expense Tracker with Receipt OCR

**Pitch:** Upload receipts, extract merchant/amount/date, categorize, monthly charts.

**Goal fit:** Portfolio with a crisp demo  
**Stack:** Next.js + Prisma (SQLite/Postgres) + vision/OCR API  
**Why:** Tangible UI + AI feature in one MVP.

### MVP scope
- Manual expense CRUD
- Receipt upload → OCR fields (editable)
- Categories + monthly total chart
- Simple CSV export

### Stretch
- Multi-currency, shared households, recurring expenses

### First milestone folders
```
apps/web/          # Next.js UI + API
packages/db/       # expenses, receipts
packages/ocr/      # provider wrapper
```

---

## 5. Local Knowledge Base Q&A

**Pitch:** Drop PDFs/notes; ask questions; answers cite source chunks.

**Goal fit:** Strong AI demo  
**Stack:** Next.js + embeddings store + local or hosted LLM  
**Why:** Shows RAG pipeline end-to-end.

### MVP scope
- Upload .txt / .md / .pdf
- Chunk + embed + store
- Chat UI with cited snippets
- Delete/reindex a document

### Stretch
- Folder sync, hybrid search, eval harness for answer quality

### First milestone folders
```
apps/web/          # upload + chat UI
packages/ingest/   # parse, chunk, embed
packages/db/       # documents + vectors
```

---

## How to choose

| If you want…              | Pick |
|---------------------------|------|
| Something you’ll use daily | **1** |
| Realtime / websockets     | **2** |
| Backend / queues depth    | **3** |
| Polished product demo     | **4** |
| LLM / RAG showcase        | **5** |

**Reply with:** `1`–`5` (or “recommended”), plus goal if different from portfolio/learn/ship, and any stack constraint (e.g. no Redis, Python only).

Once you confirm, next step is scaffold the chosen app in `d:\project` with a runnable MVP skeleton.
