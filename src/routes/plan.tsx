import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "EE Implementation Planner — DDHS Equity Intelligence" },
      { name: "description", content: "Turn Employment Equity assessment results and target dates into a prioritised implementation plan with dated milestones." },
      { property: "og:title", content: "EE Implementation Planner — DDHS Equity Intelligence" },
      { property: "og:description", content: "AI-generated, prioritised EE implementation plans with milestones for South African employers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanPage,
});

const SECTORS = ["Agriculture, forestry & fishing", "Mining & quarrying", "Manufacturing", "Electricity, gas & water", "Construction", "Wholesale & retail trade", "Transport, storage & communication", "Finance & business services", "Community, social & personal services", "Public sector", "Accommodation & food services", "Information & communication", "Other"];
const field = "w-full rounded-lg border border-line/70 bg-glass/60 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/40";
const label = "mb-1.5 block font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted";

function PlanPage() {
  const [f, setF] = useState({ assessment: "", sector: SECTORS[7], employees: "", startDate: "", submissionDate: "", planEnd: "", priorities: "" });
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const carried = sessionStorage.getItem("ddhs-assessment");
    if (carried) { setF((p) => ({ ...p, assessment: carried })); sessionStorage.removeItem("ddhs-assessment"); }
  }, []);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(f.employees, 10);
    if (f.assessment.trim().length < 20) return setErr("Please paste your assessment results (at least a few lines).");
    if (!n || n < 1) return setErr("Please enter the total number of employees.");
    if (!f.startDate || !f.planEnd || !f.submissionDate) return setErr("Please set the start, reporting and plan end dates.");
    if (f.planEnd <= f.startDate) return setErr("The plan end date must be after the start date.");
    setErr(""); setOut(""); setBusy(true);
    const ac = new AbortController(); ctrl.current = ac;
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ac.signal, body: JSON.stringify({ ...f, employees: n }) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Something went wrong."); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) { if (!l) continue; const m = JSON.parse(l); if (m.t) setOut((o) => o + m.t); if (m.error) setErr(m.error); }
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
            <Link to="/" hash="demo" className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground">Request a demo</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-14">
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted">AI-assisted · Implementation</p>
        <h1 className="mt-3 font-[Fraunces] text-[40px] font-medium leading-[1.05] tracking-tight lg:text-[52px]">EE Implementation Planner</h1>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          Add your assessment results and target dates. We'll build a prioritised plan with dated milestones, owners and evidence. Nothing you enter is stored.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={run} className="space-y-6 rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl">
            <div><label className={label}>Assessment results</label>
              <textarea rows={9} maxLength={12000} className={field} value={f.assessment} onChange={(e) => set("assessment", e.target.value)} placeholder="Paste your gap assessment, audit findings or DEL inspection notes…" />
              <p className="mt-1.5 text-[12px] text-muted">No results yet? <Link to="/assess" className="underline">Run the free gap assessment</Link>.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label}>Sector</label>
                <select className={field} value={f.sector} onChange={(e) => set("sector", e.target.value)}>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className={label}>Total employees</label>
                <input type="number" min={1} className={field} value={f.employees} onChange={(e) => set("employees", e.target.value)} /></div>
              <div><label className={label}>Plan start</label>
                <input type="date" className={field} value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
              <div><label className={label}>Next EEA2/EEA4 submission</label>
                <input type="date" className={field} value={f.submissionDate} onChange={(e) => set("submissionDate", e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>Plan end / target date</label>
                <input type="date" className={field} value={f.planEnd} onChange={(e) => set("planEnd", e.target.value)} /></div>
            </div>
            <div><label className={label}>Priorities or constraints (optional)</label>
              <textarea rows={3} maxLength={2000} className={field} value={f.priorities} onChange={(e) => set("priorities", e.target.value)} placeholder="e.g. DEL inspection in Q2, limited budget, focus on disability representation…" /></div>
            <div className="flex gap-3">
              <button disabled={busy} className="rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground disabled:opacity-60">{busy ? "Planning…" : "Build plan"}</button>
              {busy && <button type="button" onClick={() => ctrl.current?.abort()} className="rounded-full border border-line/70 px-6 py-3 text-[14px]">Stop</button>}
            </div>
          </form>

          <section aria-live="polite" className="rounded-[20px] border border-line/60 bg-panel/50 p-6 backdrop-blur-2xl lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="font-[Fraunces] text-[22px]">Implementation plan</h2>
              {out && !busy && (
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-full border border-line/70 px-3 py-1 text-[12px]">{copied ? "Copied" : "Copy"}</button>
                  <button onClick={async () => { const { exportPlanPdf } = await import("@/lib/plan-pdf"); await exportPlanPdf(out, f); }} className="rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground">Download PDF</button>
                </div>
              )}
            </div>
            {err && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[14px] text-destructive">{err}</p>}
            {!out && !err && <p className="mt-4 text-[14px] text-muted">{busy ? "Sequencing milestones against your dates…" : "Your plan will appear here."}</p>}
            {out && (
              <div className="mt-4 space-y-3 overflow-x-auto text-[14px] leading-relaxed [&_h2]:mt-6 [&_h2]:font-[Fraunces] [&_h2]:text-[18px] [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_strong]:font-semibold [&_table]:w-full [&_table]:text-[12.5px] [&_th]:border-b [&_th]:border-line [&_th]:p-1.5 [&_th]:text-left [&_td]:border-b [&_td]:border-line/50 [&_td]:p-1.5 [&_td]:align-top">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
              </div>
            )}
            {out && !busy && (
              <Link to="/progress" onClick={() => sessionStorage.setItem("ddhs-plan", out)} className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground">Track progress &amp; risks →</Link>
            )}
            <p className="mt-6 border-t border-line/60 pt-3 text-[11px] text-muted">Guidance only — not legal advice.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
