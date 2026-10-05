import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { authFetch } from "@/lib/auth-fetch";
import { AppNav } from "@/components/AppNav";
import { card, mono, input, btn, primaryBtn, must, download } from "@/lib/ui";
import { SECTOR_NAMES, GAZETTE_REF } from "@/lib/sector-targets";
import { ALL_LEVELS, COLS, COL_LABEL, EAP, eea12, representation, rowTotal, type Employee, type Grid } from "@/lib/eea12";

export const Route = createFileRoute("/_authenticated/analysis")({
  head: () => ({
    meta: [
      { title: "EEA12 Workforce Analysis — DDHS Equity Intelligence" },
      { name: "description", content: "Occupational level, race, gender, disability and movement analysis of your workforce against gazetted s15A sector targets." },
      { property: "og:title", content: "EEA12 Workforce Analysis — DDHS Equity Intelligence" },
      { property: "og:description", content: "Workforce profile, movements and representation gaps in EEA2 layout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisPage,
});

function defaultPeriod() {
  const d = new Date();
  const y = d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1; // EE reporting year: 1 Oct – 30 Sep
  return { from: `${y - 1}-10-01`, to: `${y}-09-30` };
}

function GridTable({ title, grid }: { title: string; grid: Grid }) {
  const colSum = (c: (typeof COLS)[number]) => ALL_LEVELS.reduce((s, [l]) => s + grid[l][c], 0);
  const all = ALL_LEVELS.reduce((s, [l]) => s + rowTotal(grid[l]), 0);
  return (
    <div className="mt-6 overflow-x-auto">
      <p className={mono}>{title}</p>
      <table className="mt-2 w-full text-[13px]">
        <thead><tr><th className={`${mono} py-2 pr-3 text-left`}>Occupational level</th>{COLS.map((c) => <th key={c} className={`${mono} px-2 py-2 text-right`} title={COL_LABEL[c]}>{c}</th>)}<th className={`${mono} px-2 text-right`}>Total</th></tr></thead>
        <tbody>
          {ALL_LEVELS.map(([l, label]) => (
            <tr key={l} className="border-t border-line/40"><td className="py-1.5 pr-3">{label}</td>{COLS.map((c) => <td key={c} className="px-2 text-right">{grid[l][c] || ""}</td>)}<td className="px-2 text-right font-medium">{rowTotal(grid[l])}</td></tr>
          ))}
          <tr className="border-t border-line font-medium"><td className="py-1.5">Total</td>{COLS.map((c) => <td key={c} className="px-2 text-right">{colSum(c)}</td>)}<td className="px-2 text-right">{all}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function AnalysisPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(defaultPeriod);
  const emps = useQuery({ queryKey: ["employees"], queryFn: () => must(supabase.from("employees").select("*").limit(10000)) as Promise<Employee[]> });
  const wf = useQuery({ queryKey: ["wf"], queryFn: () => must(supabase.from("workforce_profiles").select("*").maybeSingle()) as Promise<{ sector: string | null } | null> });
  const [sectorPick, setSectorPick] = useState<string | null>(null);
  const sector = sectorPick ?? wf.data?.sector ?? "";
  const saveSector = useMutation({ mutationFn: (s: string) => must(supabase.from("workforce_profiles").upsert({ sector: s || null, updated_at: new Date().toISOString() })), onSuccess: () => qc.invalidateQueries({ queryKey: ["wf"] }) });

  const r = useMemo(() => eea12(emps.data ?? [], period.from, period.to), [emps.data, period]);
  const rep = useMemo(() => representation(r.profile, sector || null), [r, sector]);
  const disPct = r.activeCount ? Math.round((r.disabilityCount / r.activeCount) * 1000) / 10 : 0;
  const eapCompare = useMemo(() => {
    const tot = r.activeCount - ALL_LEVELS.reduce((s, [l]) => s + r.profile[l].FNM + r.profile[l].FNF, 0);
    return (Object.keys(EAP) as (keyof typeof EAP)[]).map((c) => {
      const n = ALL_LEVELS.reduce((s, [l]) => s + r.profile[l][c], 0);
      const pct = tot ? Math.round((n / tot) * 1000) / 10 : 0;
      return { c, pct, eap: EAP[c], gap: Math.round((pct - EAP[c]) * 10) / 10 };
    });
  }, [r]);

  // AI explanation
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [saved, setSaved] = useState(false);
  const ac = useRef<AbortController | null>(null);
  function summaryText() {
    const g = (t: string, grid: Grid) => `${t}\n` + ALL_LEVELS.map(([l, label]) => `${label}: ` + COLS.map((c) => `${c}=${grid[l][c]}`).join(" ")).join("\n");
    return [`Reporting period ${period.from} to ${period.to}. Active employees ${r.activeCount}; with disability ${r.disabilityCount} (${disPct}%).`,
      g("Workforce profile", r.profile), g("Hires", r.hires), g("Promotions", r.promotions), g("Terminations", r.terminations),
      "Representation (designated %, target %): " + rep.levels.map((l) => `${l.level} ${l.designated}%${l.target ? ` vs ${l.target.total}%` : ""}`).join("; ")].join("\n\n");
  }
  async function explain() {
    setOut(""); setErr(""); setSaved(false); setBusy(true);
    ac.current = new AbortController();
    try {
      const res = await authFetch("/api/explain-gaps", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ac.current.signal, body: JSON.stringify({ sector: sector || "Not specified", analysis: summaryText() }) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "The AI request failed."); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let full = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) { if (!l) continue; const m = JSON.parse(l); if (m.t) { full += m.t; setOut((o) => o + m.t); } if (m.error) setErr(m.error); }
      }
      if (full.length > 40) {
        await must(supabase.from("evidence_items").insert({ title: `EEA12 analysis narrative ${period.from} – ${period.to}`, category: "analysis", body: full.slice(0, 100000), description: "AI-generated explanation of workforce gaps (guidance only)." }));
        setSaved(true);
      }
    } catch (e) { if ((e as Error).name !== "AbortError") setErr((e as Error).message); }
    setBusy(false);
  }

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const sheet = (grid: Grid) => [["Occupational level", ...COLS, "Total"], ...ALL_LEVELS.map(([l, label]) => [label, ...COLS.map((c) => grid[l][c]), rowTotal(grid[l])])];
    for (const [name, grid] of [["Workforce profile", r.profile], ["Disability", r.disability], ["Hires", r.hires], ["Promotions", r.promotions], ["Terminations", r.terminations]] as const) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet(grid)), name);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Level", "Staff", "Designated male %", "Designated female %", "Designated total %", "Target total %", "Gap (pts)"], ...rep.levels.map((l) => [l.level, l.total, l.male, l.female, l.designated, l.target?.total ?? "", l.gap ?? ""]), [], ["Sector", sector], ["Source", GAZETTE_REF], ["Period", `${period.from} to ${period.to}`]]), "Representation");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    download(`eea12-analysis-${period.to}.xlsx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }

  const none = emps.isSuccess && !emps.data.length;
  return (
    <main className="min-h-screen bg-background px-6 py-10 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <AppNav />
        <h1 className="font-[Fraunces] text-[40px] leading-tight">EEA12 workforce analysis</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">Profile by occupational level, race, gender and disability, movements in the reporting period, and representation against your sector's gazetted targets.</p>

        <section className={`${card} mt-8 flex flex-wrap items-end gap-3`}>
          <label className="text-[12px]"><span className={mono}>Period from</span><input type="date" className={`${input} mt-1`} value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} /></label>
          <label className="text-[12px]"><span className={mono}>To (profile date)</span><input type="date" className={`${input} mt-1`} value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} /></label>
          <label className="text-[12px]"><span className={mono}>Sector (s15A)</span>
            <select className={`${input} mt-1`} value={sector} onChange={(e) => { setSectorPick(e.target.value); saveSector.mutate(e.target.value); }}>
              <option value="">Choose your sector…</option>{SECTOR_NAMES.map((s) => <option key={s}>{s}</option>)}
            </select></label>
          <button className={btn} onClick={() => void exportXlsx()} disabled={none}>Export Excel</button>
        </section>

        {none ? <p className={`${card} mt-6 text-[14px]`}>No employee data yet. <Link to="/workforce" className="text-primary hover:underline">Import your workforce</Link> first.</p> : (<>
          <section className={`${card} mt-6`} aria-label="Representation">
            <p className={mono}>Representation vs s15A targets · {GAZETTE_REF}</p>
            <div className="mt-3 overflow-x-auto"><table className="w-full text-[14px]">
              <thead><tr className="text-left">{["Level", "Staff", "Designated male", "Designated female", "Designated total", "Gap"].map((h) => <th key={h} className={`${mono} py-2 pr-4`}>{h}</th>)}</tr></thead>
              <tbody>{rep.levels.map((l) => (
                <tr key={l.level} className="border-t border-line/50">
                  <td className="py-2 pr-4">{ALL_LEVELS.find(([k]) => k === l.level)?.[1]}</td><td className="pr-4">{l.total}</td>
                  <td className="pr-4">{l.male}%{l.target && <span className="text-muted"> / {l.target.male}%</span>}</td>
                  <td className="pr-4">{l.female}%{l.target && <span className="text-muted"> / {l.target.female}%</span>}</td>
                  <td className="pr-4">{l.designated}%{l.target && <span className="text-muted"> / {l.target.total}%</span>}</td>
                  <td className={l.gap === null ? "text-muted" : l.gap < 0 ? "text-destructive" : "text-accent"}>{l.gap === null ? "—" : l.gap < 0 ? `${l.gap} pts` : "On target"}</td>
                </tr>))}
                <tr className="border-t border-line/50"><td className="py-2">People with disabilities</td><td>{r.disabilityCount}</td><td /><td /><td>{disPct}%{rep.disabilityTarget !== undefined && <span className="text-muted"> / {rep.disabilityTarget}%</span>}</td>
                  <td className={rep.disabilityTarget === undefined ? "text-muted" : disPct < rep.disabilityTarget ? "text-destructive" : "text-accent"}>{rep.disabilityTarget === undefined ? "—" : disPct < rep.disabilityTarget ? `${Math.round((disPct - rep.disabilityTarget) * 10) / 10} pts` : "On target"}</td></tr>
              </tbody></table></div>
            <p className="mt-2 text-[12px] text-muted">Your figure / gazetted target. Targets apply to the top four levels. Designated = African, Coloured and Indian people and all women, excluding foreign nationals.</p>

            <p className={`${mono} mt-6`}>Whole workforce vs national EAP (indicative)</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4 lg:grid-cols-8">
              {eapCompare.map((x) => <div key={x.c} className="rounded-lg border border-line/50 p-2"><p className={mono}>{COL_LABEL[x.c]}</p><p className="mt-1">{x.pct}% <span className="text-muted">/ {x.eap}%</span></p><p className={x.gap < 0 ? "text-destructive" : "text-accent"}>{x.gap > 0 ? "+" : ""}{x.gap}</p></div>)}
            </div>
            <p className="mt-2 text-[12px] text-muted">EAP figures are approximate national QLFS shares — replace with the latest QLFS or your provincial EAP before relying on them.</p>
          </section>

          <section className={`${card} mt-6`} aria-label="Workforce profile">
            <p className="text-[13px] text-muted">{r.activeCount} employees active on {period.to}. Codes: A African, C Coloured, I Indian, W White, M/F male/female, FN foreign national.</p>
            <GridTable title="Workforce profile (EEA2 table 2.1 layout)" grid={r.profile} />
            <GridTable title="Employees with disabilities" grid={r.disability} />
          </section>

          <section className={`${card} mt-6`} aria-label="Movements">
            <p className="text-[13px] text-muted">Movements between {period.from} and {period.to}, from start, promotion and end dates.</p>
            <GridTable title="Recruitment (hires)" grid={r.hires} />
            <GridTable title="Promotions" grid={r.promotions} />
            <GridTable title="Terminations" grid={r.terminations} />
          </section>

          <section className={`${card} mt-6`} aria-label="AI explanation">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={mono}>Explain the gaps (AI)</p>
              {busy ? <button className={btn} onClick={() => ac.current?.abort()}>Stop</button> : <button className={primaryBtn} onClick={() => void explain()}>Explain gaps</button>}
            </div>
            {err && <p role="alert" className="mt-3 text-[13px] text-destructive">{err}</p>}
            {saved && <p className="mt-3 text-[13px] text-accent">Saved to the <Link to="/evidence" className="underline">evidence repository</Link>.</p>}
            {out && <div className="prose prose-sm mt-4 max-w-none text-foreground"><ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown></div>}
          </section>
        </>)}
      </div>
    </main>
  );
}
