import { saveResult } from "@/lib/saved-results";
import { authFetch } from "@/lib/auth-fetch";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "EE Progress & Risk Review — DDHS Equity Intelligence" },
      { name: "description", content: "Log Employment Equity milestone progress, blockers and revised dates to surface delivery risks and prioritised recovery actions." },
      { property: "og:title", content: "EE Progress & Risk Review — DDHS Equity Intelligence" },
      { property: "og:description", content: "AI-assisted delivery risk review and recovery actions for South African EE plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

const STATUSES = ["Not started", "On track", "At risk", "Delayed", "Complete"] as const;
type M = { name: string; originalDate: string; revisedDate: string; status: (typeof STATUSES)[number]; progress: string; blockers: string };
const blank = (): M => ({ name: "", originalDate: "", revisedDate: "", status: "On track", progress: "0", blockers: "" });
const field = "w-full rounded-lg border border-line/70 bg-glass/60 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/40";
const label = "mb-1.5 block font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted";

function ProgressPage() {
  const [reportDate, setReportDate] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");
  const [context, setContext] = useState("");
  const [ms, setMs] = useState<M[]>([blank()]);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const upd = (i: number, k: keyof M, v: string) => setMs((p) => p.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  useEffect(() => {
    setReportDate(new Date().toISOString().slice(0, 10));
    const carried = sessionStorage.getItem("ddhs-plan");
    if (carried) { setContext(carried.slice(0, 6000)); sessionStorage.removeItem("ddhs-plan"); }
  }, []);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const list = ms.filter((m) => m.name.trim());
    if (!list.length) return setErr("Add at least one milestone with a name.");
    if (!reportDate || !submissionDate) return setErr("Please set the report date and next statutory submission date.");
    if (list.some((m) => !m.originalDate)) return setErr("Each milestone needs its original target date.");
    setErr(""); setOut(""); setBusy(true);
    const ac = new AbortController(); ctrl.current = ac;
    try {
      const body = { reportDate, submissionDate, context, milestones: list.map((m) => ({ ...m, revisedDate: m.revisedDate || m.originalDate, progress: Math.max(0, Math.min(100, parseInt(m.progress, 10) || 0)) })) };
      const res = await authFetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ac.signal, body: JSON.stringify(body) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Something went wrong."); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let full = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) { void saveResult("progress", full); break; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) { if (!l) continue; const m = JSON.parse(l); if (m.t) { full += m.t; setOut((o) => o + m.t); } if (m.error) setErr(m.error); }
      }
    } catch (x) {
      if ((x as Error).name !== "AbortError") setErr((x as Error).message);
    } finally { setBusy(false); ctrl.current = null; }
  }

  return (
    <div className="min-h-screen font-[Inter] antialiased">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-glass/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-baseline gap-2.5">
            <span className="font-[Fraunces] text-[19px] font-semibold tracking-tight">DDHS</span>
            <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.22em] text-muted">Equity Intelligence</span>
          </Link>
          <div className="flex items-center gap-5 text-[13px]">
            <Link to="/assess" className="text-muted hover:text-foreground">Gap Assessment</Link>
            <Link to="/plan" className="text-muted hover:text-foreground">Planner</Link>
            <Link to="/" hash="demo" className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground">Request a demo</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-14">
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted">AI-assisted · Delivery</p>
        <h1 className="mt-3 font-[Fraunces] text-[40px] font-medium leading-[1.05] tracking-tight lg:text-[52px]">Progress &amp; Risk Review</h1>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          Update each milestone with progress, blockers and any revised date. We'll flag delivery risks and recommend recovery actions in priority order. Nothing you enter is stored.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <form onSubmit={run} className="space-y-6 rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label}>Report date</label><input type="date" className={field} value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
              <div><label className={label}>Next EEA2/EEA4 submission</label><input type="date" className={field} value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} /></div>
            </div>

            {ms.map((m, i) => (
              <fieldset key={i} className="space-y-3 rounded-xl border border-line/60 p-4">
                <div className="flex items-center justify-between">
                  <legend className="font-[JetBrains_Mono] text-[11px] uppercase tracking-[0.16em] text-muted">Milestone {i + 1}</legend>
                  {ms.length > 1 && <button type="button" onClick={() => setMs((p) => p.filter((_, j) => j !== i))} className="text-[12px] text-muted hover:text-destructive">Remove</button>}
                </div>
                <input aria-label="Milestone name" className={field} placeholder="e.g. Complete barriers analysis" value={m.name} onChange={(e) => upd(i, "name", e.target.value)} maxLength={200} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={label}>Original target</label><input type="date" className={field} value={m.originalDate} onChange={(e) => upd(i, "originalDate", e.target.value)} /></div>
                  <div><label className={label}>Revised target</label><input type="date" className={field} value={m.revisedDate} onChange={(e) => upd(i, "revisedDate", e.target.value)} /></div>
                  <div><label className={label}>Status</label><select className={field} value={m.status} onChange={(e) => upd(i, "status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
                  <div><label className={label}>Progress %</label><input type="number" min={0} max={100} className={field} value={m.progress} onChange={(e) => upd(i, "progress", e.target.value)} /></div>
                </div>
                <textarea rows={2} maxLength={1500} aria-label="Blockers" className={field} placeholder="Blockers (e.g. union consultation postponed, HRIS data incomplete)" value={m.blockers} onChange={(e) => upd(i, "blockers", e.target.value)} />
              </fieldset>
            ))}
            {ms.length < 25 && <button type="button" onClick={() => setMs((p) => [...p, blank()])} className="rounded-full border border-line/70 px-4 py-2 text-[13px]">+ Add milestone</button>}

            <div><label className={label}>Plan context (optional)</label>
              <textarea rows={4} maxLength={6000} className={field} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste your implementation plan or any background…" /></div>

            <div className="flex gap-3">
              <button disabled={busy} className="rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground disabled:opacity-60">{busy ? "Reviewing…" : "Review risks"}</button>
              {busy && <button type="button" onClick={() => ctrl.current?.abort()} className="rounded-full border border-line/70 px-6 py-3 text-[14px]">Stop</button>}
            </div>
          </form>

          <section aria-live="polite" className="rounded-[20px] border border-line/60 bg-panel/50 p-6 backdrop-blur-2xl lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="font-[Fraunces] text-[22px]">Risk review</h2>
              {out && !busy && <button onClick={() => { navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-full border border-line/70 px-3 py-1 text-[12px]">{copied ? "Copied" : "Copy"}</button>}
            </div>
            {err && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[14px] text-destructive">{err}</p>}
            {!out && !err && <p className="mt-4 text-[14px] text-muted">{busy ? "Checking slippage against statutory deadlines…" : "Your risk review will appear here."}</p>}
            {out && (
              <div className="mt-4 space-y-3 overflow-x-auto text-[14px] leading-relaxed [&_h2]:mt-6 [&_h2]:font-[Fraunces] [&_h2]:text-[18px] [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_strong]:font-semibold [&_table]:w-full [&_table]:text-[12.5px] [&_th]:border-b [&_th]:border-line [&_th]:p-1.5 [&_th]:text-left [&_td]:border-b [&_td]:border-line/50 [&_td]:p-1.5 [&_td]:align-top">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
              </div>
            )}
            <p className="mt-6 border-t border-line/60 pt-3 text-[11px] text-muted">Guidance only — not legal advice.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
