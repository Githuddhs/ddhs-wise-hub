import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LEVELS, SECTIONS, type Goal } from "@/lib/ee-plan-template";

export const Route = createFileRoute("/_authenticated/document")({
  head: () => ({
    meta: [
      { title: "Section 20 EE Plan Builder — DDHS Equity Intelligence" },
      { name: "description", content: "Draft a Section 20 Employment Equity Plan by filling in placeholders, then download it as an editable Word document." },
      { property: "og:title", content: "Section 20 EE Plan Builder — DDHS Equity Intelligence" },
      { property: "og:description", content: "Fill-in-the-blanks Employment Equity Plan template aligned to section 20 of the EE Act." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentPage,
});

const KEY = "ddhs-ee-plan-draft";
const field = "w-full rounded-lg border border-line/70 bg-glass/60 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/40";
const label = "mb-1.5 block font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted";
const emptyGoals = (): Goal[] => LEVELS.map(() => ({ current: "", target: "", disability: "" }));

function Ph({ v, l }: { v?: string | undefined; l: string }) {
  return v?.trim() ? <span className="whitespace-pre-line">{v}</span> : <mark className="rounded bg-accent/20 px-1 text-foreground">[{l}]</mark>;
}

function DocumentPage() {
  const [v, setV] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<Goal[]>(emptyGoals);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) { setV(s.v || {}); setGoals(s.goals || emptyGoals()); } } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify({ v, goals })); }, [v, goals, loaded]);

  const all = SECTIONS.flatMap((s) => s.fields);
  const filled = all.filter((f) => v[f.key]?.trim()).length;
  const setG = (i: number, k: keyof Goal, x: string) => setGoals((g) => g.map((r, j) => (j === i ? { ...r, [k]: x } : r)));

  async function download() {
    setBusy(true);
    try { const { exportEePlanDocx } = await import("@/lib/ee-plan-docx"); await exportEePlanDocx(v, goals); } finally { setBusy(false); }
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
            <Link to="/progress" className="text-muted hover:text-foreground">Progress</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-14">
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted">Section 20 · Document builder</p>
        <h1 className="mt-3 font-[Fraunces] text-[40px] font-medium leading-[1.05] tracking-tight lg:text-[52px]">EE Plan Builder</h1>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Fill in the placeholders and download an editable Word document. Your draft is saved only in this browser. Anything you leave blank stays as a highlighted placeholder.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            {SECTIONS.map((s, i) => (
              <fieldset key={s.title} className="space-y-4 rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl">
                <legend className="sr-only">{s.title}</legend>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-[Fraunces] text-[19px]">{i + 1}. {s.title}</h2>
                  <span className="font-[JetBrains_Mono] text-[10px] text-muted">{s.ref}</span>
                </div>
                {s.title === "Numerical goals" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-2 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] text-muted"><span>Level</span><span>Current %</span><span>Target %</span><span>PWD %</span></div>
                    {LEVELS.map((l, j) => (
                      <div key={l} className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-2">
                        <span className="text-[12px]">{l}</span>
                        {(["current", "target", "disability"] as const).map((k) => (
                          <input key={k} aria-label={`${l} ${k}`} inputMode="decimal" className={field} value={goals[j]?.[k] ?? ""} onChange={(e) => setG(j, k, e.target.value)} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {s.fields.map((f) => (
                      <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                        <label htmlFor={f.key} className={label}>{f.label}</label>
                        {f.long
                          ? <textarea id={f.key} rows={4} className={field} placeholder={f.hint} value={v[f.key] ?? ""} onChange={(e) => setV((p) => ({ ...p, [f.key]: e.target.value }))} />
                          : <input id={f.key} type={/Date$/.test(f.key) ? "date" : "text"} className={field} value={v[f.key] ?? ""} onChange={(e) => setV((p) => ({ ...p, [f.key]: e.target.value }))} />}
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
          </div>

          <section className="rounded-[20px] border border-line/60 bg-panel/50 p-6 backdrop-blur-2xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <span className="font-[JetBrains_Mono] text-[11px] text-muted">{filled}/{all.length} fields filled</span>
              <div className="flex gap-2">
                <button onClick={() => { if (confirm("Clear the whole draft?")) { setV({}); setGoals(emptyGoals()); } }} className="rounded-full border border-line/70 px-3 py-1.5 text-[12px]">Clear</button>
                <button onClick={download} disabled={busy} className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground disabled:opacity-60">{busy ? "Preparing…" : "Download Word"}</button>
              </div>
            </div>
            <article className="mt-5 space-y-4 rounded-xl border border-line/60 bg-background p-6 text-[13px] leading-relaxed">
              <h2 className="font-[Fraunces] text-[24px] text-primary">Employment Equity Plan</h2>
              <p className="text-[15px]"><Ph v={v["employer"]} l="Registered employer name" /></p>
              <p className="italic text-muted">Prepared in terms of section 20 of the Employment Equity Act 55 of 1998, as amended</p>
              {SECTIONS.map((s, i) => (
                <div key={s.title}>
                  <h3 className="mt-4 font-[Fraunces] text-[16px] text-primary">{i + 1}. {s.title} <span className="font-[JetBrains_Mono] text-[10px] text-muted">{s.ref}</span></h3>
                  <p className="mt-1">{s.intro}</p>
                  {s.title === "Numerical goals" ? (
                    <table className="mt-2 w-full text-[11.5px]">
                      <thead><tr className="bg-primary text-primary-foreground"><th className="p-1.5 text-left">Level</th><th className="p-1.5">Current</th><th className="p-1.5">Target</th><th className="p-1.5">PWD</th></tr></thead>
                      <tbody>{LEVELS.map((l, j) => <tr key={l} className="border-b border-line/50"><td className="p-1.5">{l}</td>{(["current", "target", "disability"] as const).map((k) => <td key={k} className="p-1.5 text-center">{goals[j]?.[k] || "—"}</td>)}</tr>)}</tbody>
                    </table>
                  ) : s.fields.map((f) => (
                    <p key={f.key} className="mt-1">{(!f.long || s.fields.length > 1) && <strong>{f.label}: </strong>}<Ph v={v[f.key]} l={f.label} /></p>
                  ))}
                </div>
              ))}
            </article>
            <p className="mt-4 text-[12px]"><Link to="/review" className="underline">Check your finished draft with the Plan Review</Link></p>
            <p className="mt-2 text-[11px] text-muted">Template guidance only — have the final plan reviewed before adoption. Not legal advice.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
