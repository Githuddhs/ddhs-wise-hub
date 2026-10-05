import { saveResult } from "@/lib/saved-results";
import { authFetch } from "@/lib/auth-fetch";
import { SECTOR_NAMES } from "@/lib/sector-targets";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/assess")({
  head: () => ({
    meta: [
      { title: "EE Gap Assessment — DDHS Equity Intelligence" },
      {
        name: "description",
        content:
          "Describe your workforce and EE plan to get AI-identified Employment Equity compliance gaps and practical next steps.",
      },
      { property: "og:title", content: "EE Gap Assessment — DDHS Equity Intelligence" },
      {
        property: "og:description",
        content: "AI-assisted Employment Equity Act gap analysis for South African employers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssessPage,
});

const SECTORS = [...SECTOR_NAMES, "Other / not sure"];
const PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "National / multiple"];
const LEVELS = ["Top management", "Senior management", "Professionally qualified",
  "Skilled technical", "Semi-skilled", "Unskilled"];
const YNU = ["Yes", "No", "Unsure"];

const field = "w-full rounded-lg border border-line/70 bg-glass/60 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/40";
const label = "mb-1.5 block font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted";

function AssessPage() {
  const [f, setF] = useState({
    sector: "Manufacturing", province: PROVINCES[0], employees: "", designated: true,
    demographics: "", planPeriod: "", eea2: "Unsure", committee: "Unsure",
    sectorTargets: "Unsure", barriers: "Unsure", planNotes: "",
  });
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(f.employees, 10);
    if (!n || n < 1) return setErr("Please enter the total number of employees.");
    setErr(""); setOut(""); setBusy(true);
    const ac = new AbortController(); ctrl.current = ac;
    try {
      const res = await authFetch("/api/assess", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ac.signal,
        body: JSON.stringify({ ...f, employees: n, levels }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Something went wrong.");
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let full = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) { void saveResult("assess", full); break; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l) continue;
          const m = JSON.parse(l);
          if (m.t) { full += m.t; setOut((o) => o + m.t); }
          if (m.error) setErr(m.error);
        }
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
          <Link to="/" hash="demo" className="rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground">Request a demo</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-14">
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted">AI-assisted · Employment Equity Act</p>
        <h1 className="mt-3 font-[Fraunces] text-[40px] font-medium leading-[1.05] tracking-tight lg:text-[52px]">EE Gap Assessment</h1>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          Describe your workforce and current EE plan. We'll highlight likely compliance gaps and practical next steps. Nothing you enter is stored.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={run} className="space-y-6 rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 font-[Fraunces] text-[20px]">Organisation</legend>
              <div><label className={label}>Sector</label>
                <select className={field} value={f.sector} onChange={(e) => set("sector", e.target.value)}>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className={label}>Province</label>
                <select className={field} value={f.province} onChange={(e) => set("province", e.target.value)}>{PROVINCES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className={label}>Total employees</label>
                <input type="number" min={1} required className={field} value={f.employees} onChange={(e) => set("employees", e.target.value)} /></div>
              <div><label className={label}>Designated employer</label>
                <select className={field} value={f.designated ? "Yes" : "No"} onChange={(e) => set("designated", e.target.value === "Yes")}><option>Yes</option><option>No</option></select></div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-3 font-[Fraunces] text-[20px]">Workforce profile</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {LEVELS.map((l) => (
                  <div key={l}><label className={label}>{l}</label>
                    <input className={field} maxLength={200} placeholder="e.g. 12 (3 AF, 2 AM, 5 WM…)" value={levels[l] ?? ""} onChange={(e) => setLevels((p) => ({ ...p, [l]: e.target.value }))} /></div>
                ))}
              </div>
              <div><label className={label}>Race, gender & disability notes</label>
                <textarea rows={3} maxLength={3000} className={field} value={f.demographics} onChange={(e) => set("demographics", e.target.value)} placeholder="e.g. 1.2% employees with disabilities; senior management 70% white male…" /></div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-3 font-[Fraunces] text-[20px]">Current EE plan</legend>
              <div><label className={label}>Plan period</label>
                <input className={field} maxLength={100} value={f.planPeriod} onChange={(e) => set("planPeriod", e.target.value)} placeholder="e.g. Sept 2023 – Aug 2026" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["eea2", "EEA2 / EEA4 submitted"], ["committee", "EE committee in place"], ["sectorTargets", "Sector targets applied"], ["barriers", "Barriers analysis done"]] as const).map(([k, t]) => (
                  <div key={k}><label className={label}>{t}</label>
                    <select className={field} value={f[k]} onChange={(e) => set(k, e.target.value)}>{YNU.map((s) => <option key={s}>{s}</option>)}</select></div>
                ))}
              </div>
              <div><label className={label}>Describe your EE plan</label>
                <textarea rows={4} maxLength={5000} className={field} value={f.planNotes} onChange={(e) => set("planNotes", e.target.value)} placeholder="Goals, numerical targets, affirmative action measures, consultation…" /></div>
            </fieldset>

            <div className="flex gap-3">
              <button disabled={busy} className="rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground disabled:opacity-60">{busy ? "Analysing…" : "Analyse"}</button>
              {busy && <button type="button" onClick={() => ctrl.current?.abort()} className="rounded-full border border-line/70 px-6 py-3 text-[14px]">Stop</button>}
            </div>
          </form>

          <section aria-live="polite" className="rounded-[20px] border border-line/60 bg-panel/50 p-6 backdrop-blur-2xl lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-[Fraunces] text-[22px]">Assessment</h2>
            {err && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[14px] text-destructive">{err}</p>}
            {!out && !err && <p className="mt-4 text-[14px] text-muted">{busy ? "Reviewing your profile against the EE Act…" : "Your results will appear here."}</p>}
            {out && (
              <div className="prose-ee mt-4 space-y-3 text-[14px] leading-relaxed [&_h2]:mt-6 [&_h2]:font-[Fraunces] [&_h2]:text-[18px] [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_strong]:font-semibold">
                <ReactMarkdown>{out}</ReactMarkdown>
              </div>
            )}
            {out && !busy && (
              <Link to="/plan" onClick={() => sessionStorage.setItem("ddhs-assessment", out)} className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground">Build implementation plan →</Link>
            )}
            <p className="mt-6 border-t border-line/60 pt-3 text-[11px] text-muted">Guidance only — not legal advice.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
