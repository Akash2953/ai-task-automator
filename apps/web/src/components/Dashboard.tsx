"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type JobRun = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  message: string | null;
  error: string | null;
};

type Job = {
  id: string;
  title: string;
  prompt: string;
  scheduleType: string;
  runAt: string | null;
  cronExpr: string | null;
  nextRunAt: string | null;
  timezone: string;
  enabled: boolean;
  handler: string;
  lastStatus: string | null;
  createdAt: string;
  runs: JobRun[];
};

type ParsedPreview = {
  title: string;
  scheduleType: "once" | "cron";
  runAt: string | null;
  cronExpr: string | null;
  timezone: string;
  handler: string;
  nextRunAt: string | null;
  notes?: string;
};

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    if (!res.ok) throw new Error("Failed to load jobs");
    const data = (await res.json()) as { jobs: Job[] };
    setJobs(data.jobs);
  }, []);

  useEffect(() => {
    loadJobs().catch((err: Error) => setError(err.message));
    const id = setInterval(() => {
      loadJobs().catch(() => undefined);
    }, 10000);
    return () => clearInterval(id);
  }, [loadJobs]);

  async function onParse(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, parseOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setPreview(data.parsed as ParsedPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    if (!preview) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          title: preview.title,
          scheduleType: preview.scheduleType,
          runAt: preview.runAt,
          cronExpr: preview.cronExpr,
          timezone: preview.timezone,
          handler: preview.handler,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setPrompt("");
      setPreview(null);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(job: Job) {
    setError(null);
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !job.enabled }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Update failed");
      return;
    }
    await loadJobs();
  }

  async function removeJob(job: Job) {
    if (!confirm(`Delete “${job.title}”?`)) return;
    const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await loadJobs();
  }

  return (
    <main className="shell">
      <header className="hero">
        <h1>Personal AI Task Automator</h1>
        <p>
          Describe a reminder in plain language. The app parses it into a
          one-shot or recurring job; a local worker runs due jobs and records
          history.
        </p>
      </header>

      <section className="panel">
        <h2>New job</h2>
        <form className="form" onSubmit={onParse}>
          <label>
            Natural language
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setPreview(null);
              }}
              placeholder='e.g. "remind me every Friday to review expenses"'
              required
            />
          </label>
          <div className="actions">
            <button className="btn" type="submit" disabled={loading || !prompt.trim()}>
              {loading ? "Working…" : "Parse"}
            </button>
            {preview && (
              <button
                className="btn secondary"
                type="button"
                disabled={loading}
                onClick={onCreate}
              >
                Create job
              </button>
            )}
          </div>
          <p className="hint">
            Try: “remind me in 2 minutes to stand up”, “every day review inbox”,
            “every Friday review expenses”. Optional{" "}
            <code>OPENAI_API_KEY</code> improves parsing; heuristics work without
            it.
          </p>
        </form>

        {preview && (
          <div className="form" style={{ marginTop: "1rem" }}>
            <p className="notes">{preview.notes}</p>
            <div className="row">
              <label>
                Title
                <input
                  value={preview.title}
                  onChange={(e) =>
                    setPreview({ ...preview, title: e.target.value })
                  }
                />
              </label>
              <label>
                Schedule
                <select
                  value={preview.scheduleType}
                  onChange={(e) =>
                    setPreview({
                      ...preview,
                      scheduleType: e.target.value as "once" | "cron",
                    })
                  }
                >
                  <option value="once">Once</option>
                  <option value="cron">Recurring (cron)</option>
                </select>
              </label>
            </div>
            {preview.scheduleType === "once" ? (
              <label>
                Run at (local ISO editable)
                <input
                  value={preview.runAt ?? ""}
                  onChange={(e) =>
                    setPreview({ ...preview, runAt: e.target.value })
                  }
                />
              </label>
            ) : (
              <label>
                Cron expression
                <input
                  value={preview.cronExpr ?? ""}
                  onChange={(e) =>
                    setPreview({ ...preview, cronExpr: e.target.value })
                  }
                />
              </label>
            )}
            <p className="muted">Next run estimate: {formatWhen(preview.nextRunAt)}</p>
          </div>
        )}

        {error && <p className="status failed">{error}</p>}
      </section>

      <section className="panel">
        <h2>Jobs</h2>
        {jobs.length === 0 ? (
          <p className="empty">No jobs yet. Parse a prompt above to create one.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Schedule</th>
                <th>Next / status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.title}</strong>
                    <div className="muted">{job.prompt}</div>
                    {expanded[job.id] && job.runs.length > 0 && (
                      <ul className="runs">
                        {job.runs.map((run) => (
                          <li key={run.id}>
                            <span className={`status ${run.status}`}>
                              {run.status}
                            </span>{" "}
                            {formatWhen(run.startedAt)}
                            {run.message ? ` — ${run.message}` : ""}
                            {run.error ? ` — ${run.error}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    {job.runs.length > 0 && (
                      <button
                        className="btn secondary"
                        type="button"
                        style={{ marginTop: "0.4rem" }}
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [job.id]: !prev[job.id],
                          }))
                        }
                      >
                        {expanded[job.id] ? "Hide runs" : "Show runs"}
                      </button>
                    )}
                  </td>
                  <td>
                    {job.scheduleType === "cron" ? (
                      <>
                        cron <code>{job.cronExpr}</code>
                      </>
                    ) : (
                      <>once {formatWhen(job.runAt)}</>
                    )}
                    <div className="muted">{job.timezone}</div>
                  </td>
                  <td>
                    <div>{job.enabled ? formatWhen(job.nextRunAt) : "Paused"}</div>
                    <div
                      className={`status ${
                        job.lastStatus === "success"
                          ? "success"
                          : job.lastStatus === "failed"
                            ? "failed"
                            : "idle"
                      }`}
                    >
                      {job.lastStatus ?? "waiting"}
                    </div>
                  </td>
                  <td>
                    <div className="job-actions">
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => toggleEnabled(job)}
                      >
                        {job.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => removeJob(job)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
