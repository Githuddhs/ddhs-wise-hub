import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GAZETTE_REF, LEVELS, SECTOR_TARGETS } from "@/lib/sector-targets";

export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "Section 15A Sector Targets — DDHS Equity Intelligence" },
      { name: "description", content: "Official 5-year sectoral numerical targets for all 18 economic sectors under section 15A of the Employment Equity Act." },
      { property: "og:title", content: "Section 15A Sector Targets — DDHS Equity Intelligence" },
      { property: "og:description", content: "Look up the gazetted EE sector targets by occupational level, gender and disability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TargetsPage,
});

const mono = "font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted";

function TargetsPage() {
  const [i, setI] = useState(10);
  const s = SECTOR_TARGETS[i] ?? SECTOR_TARGETS[0]!;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/" className={mono}>← DDHS Equity Intelligence</Link>
      <h1 className="mt-4 font-[Fraunces] text-[40px] leading-tight">Section 15A sector targets</h1>
      <p className="mt-2 text-[14px] text-muted">5-year numerical targets for people from designated groups, per {GAZETTE_REF}. These figures are used automatically by the Gap Assessment and Planner.</p>
      <label className={`${mono} mt-8 block`} htmlFor="sec">Economic sector</label>
      <select id="sec" value={i} onChange={(e) => setI(Number(e.target.value))} className="mt-1.5 w-full rounded-lg border border-line/70 bg-glass/70 px-3 py-2 text-[14px]">
        {SECTOR_TARGETS.map((t, k) => <option key={t.name} value={k}>{t.name}</option>)}
      </select>
      <div className="mt-6 overflow-x-auto rounded-[16px] border border-line/60 bg-panel/50">
        <table className="w-full text-left text-[14px]">
          <thead><tr className={mono}><th className="p-3">Occupational level</th><th className="p-3">Male</th><th className="p-3">Female</th><th className="p-3">Total</th></tr></thead>
          <tbody>
            {LEVELS.map(([k, l]) => (
              <tr key={k} className="border-t border-line/50"><td className="p-3">{l}</td><td className="p-3">{s[k].male}%</td><td className="p-3">{s[k].female}%</td><td className="p-3 font-medium text-primary">{s[k].total}%</td></tr>
            ))}
            <tr className="border-t border-line/50"><td className="p-3">People with disabilities (all levels)</td><td className="p-3" colSpan={2}>—</td><td className="p-3 font-medium text-primary">{s.disability}%</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[12px] text-muted">Targets exclude white males without disabilities and foreign nationals, so they don't add up to 100%. Employers aren't penalised where they show reasonable grounds for not meeting them. Guidance only, not legal advice.</p>
    </main>
  );
}
