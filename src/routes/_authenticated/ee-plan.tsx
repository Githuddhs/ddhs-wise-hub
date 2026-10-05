import { fetchAllEmployees } from "@/lib/employees";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { card, mono, input, btn, primaryBtn, must, todayIso } from "@/lib/ui";
import { ALL_LEVELS, LEVEL_LABEL, eea12, representation, type Employee } from "@/lib/eea12";

export const Route = createFileRoute("/_authenticated/ee-plan")({
  head: () => ({
    meta: [
      { title: "EEA13 Implementation Plan — DDHS Equity Intelligence" },
      { name: "description", content: "Barriers, numerical goals, annual objectives and affirmative action measures with owners, milestones and due dates." },
      { property: "og:title", content: "EEA13 Implementation Plan — DDHS Equity Intelligence" },
      { property: "og:description", content: "A measurable, accountable Employment Equity plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanPage,
});

const BARRIER_CATS = ["Recruitment procedures", "Advertising positions", "Selection criteria", "Appointments", "Job classification & grading", "Remuneration & benefits", "Terms & conditions", "Work environment & facilities", "Training & development", "Performance & evaluation", "Promotions", "Succession & retention", "Disciplinary measures", "Dismissals", "Reasonable accommodation", "Corporate culture", "HIV/AIDS & disability", "Other"];
const STATUSES = ["Open", "In progress", "Done"] as const;

function PlanPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const onError = (e: Error) => setErr(e.message);
  const plan = useQuery({
    queryKey: ["ee-plan"],
    queryFn: async (): Promise<{ id: string; title: string; start_date: string | null; end_date: string | null }> => {
      const { data: p, error } = await supabase.from("ee_plans").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      if (p) return p;
      return must(supabase.from("ee_plans").insert({}).select().single());
    },
  });
  const pid = plan.data?.id;
  const q = <T,>(table: "plan_barriers" | "plan_goals" | "plan_objectives" | "plan_measures", order: string) =>
    ({ queryKey: [table, pid], enabled: !!pid, queryFn: () => must(supabase.from(table).select("*").eq("plan_id", pid!).order(order)) as Promise<T[]> });
  type B = { id: string; category: string; description: string; affected_groups: string | null };
  type G = { id: string; level: string; grp: string; year: number; current_pct: number | null; target_pct: number };
  type O = { id: string; year: number; objective: string };
  type M = { id: string; barrier_id: string | null; measure: string; owner: string | null; milestones: string | null; due_date: string | null; status: string };
  const barriers = useQuery(q<B>("plan_barriers", "created_at"));
  const goals = useQuery(q<G>("plan_goals", "year"));
  const objectives = useQuery(q<O>("plan_objectives", "year"));
  const measures = useQuery(q<M>("plan_measures", "due_date"));
  const emps = useQuery({ queryKey: ["employees"], queryFn: () => fetchAllEmployees<Employee>() });
  const wf = useQuery({ queryKey: ["wf"], queryFn: () => must(supabase.from("workforce_profiles").select("*").maybeSingle()) as Promise<{ sector: string | null } | null> });
  const inv = (t: string) => qc.invalidateQueries({ queryKey: [t] });

  const [hdr, setHdr] = useState({ title: "", start_date: "", end_date: "" });
  useEffect(() => { if (plan.data) setHdr({ title: plan.data.title, start_date: plan.data.start_date ?? "", end_date: plan.data.end_date ?? "" }); }, [plan.data]);
  const saveHdr = useMutation({ mutationFn: () => must(supabase.from("ee_plans").update({ title: hdr.title || "Employment Equity Plan", start_date: hdr.start_date || null, end_date: hdr.end_date || null, updated_at: new Date().toISOString() }).eq("id", pid!)), onSuccess: () => inv("ee-plan"), onError });

  const ins = useMutation({ mutationFn: ({ t, row }: { t: "plan_barriers" | "plan_goals" | "plan_objectives" | "plan_measures"; row: Record<string, unknown> }) => must(supabase.from(t).insert({ ...row, plan_id: pid! } as never)), onSuccess: (_d, v) => inv(v.t), onError });
  const upd = useMutation({ mutationFn: ({ t, id, row }: { t: "plan_barriers" | "plan_goals" | "plan_objectives" | "plan_measures"; id: string; row: Record<string, unknown> }) => must(supabase.from(t).update(row as never).eq("id", id)), onSuccess: (_d, v) => inv(v.t), onError });
  const del = useMutation({ mutationFn: ({ t, id }: { t: "plan_barriers" | "plan_goals" | "plan_objectives" | "plan_measures"; id: string }) => must(supabase.from(t).delete().eq("id", id)), onSuccess: (_d, v) => inv(v.t), onError });

  const startYear = hdr.start_date ? Number(hdr.start_date.slice(0, 4)) : new Date().getFullYear();
  const endYear = hdr.end_date ? Number(hdr.end_date.slice(0, 4)) : startYear + 4;
  const years = Array.from({ length: Math.max(1, Math.min(5, endYear - startYear + 1)) }, (_, i) => startYear + i);

  const prefill = useMutation({
    mutationFn: async () => {
      if (!emps.data?.length) throw new Error("Import your workforce first to pre-fill goals from the analysis.");
      const r = eea12(emps.data, `${startYear - 1}-10-01`, todayIso());
      const rep = representation(r.profile, wf.data?.sector ?? null, r.disability);
      const rows = rep.levels.filter((l) => l.target && l.gap !== null && l.gap < 0).flatMap((l) => years.map((y, i) => ({
        plan_id: pid!, level: l.level, grp: "Designated total", year: y, current_pct: l.designated,
        target_pct: Math.round((l.designated + ((l.target!.total - l.designated) * (i + 1)) / years.length) * 10) / 10,
      })));
      if (!rows.length) throw new Error(wf.data?.sector ? "No under-represented levels against your sector targets — add goals manually." : "Choose your sector on the EEA12 analysis page first.");
      await must(supabase.from("plan_goals").delete().eq("plan_id", pid!).eq("grp", "Designated total"));
      return must(supabase.from("plan_goals").insert(rows));
    },
    onSuccess: () => inv("plan_goals"), onError,
  });

  function toMarkdown() {
    const b = barriers.data ?? [], m = measures.data ?? [], g = goals.data ?? [], o = objectives.data ?? [];
    return [`## Plan overview`, `${hdr.title}, ${hdr.start_date || "start"} to ${hdr.end_date || "end"}. ${b.length} barriers, ${m.length} measures, ${g.length} numerical goals.`,
      `## Priorities`, ...o.map((x, i) => `${i + 1}. **${x.year}** — ${x.objective}`),
      `## Milestones`, `| # | Milestone | Target date (YYYY-MM-DD) | Owner | Evidence | Reference |`, `|---|---|---|---|---|---|`,
      ...m.map((x, i) => `| ${i + 1} | ${x.measure} | ${x.due_date ?? ""} | ${x.owner ?? ""} | ${(x.milestones ?? "").replace(/\n/g, "; ")} | s20(2)(c) |`),
      `## Phases`, ...b.map((x) => `- ${x.category}: ${x.description}`),
      `## Risks & monitoring`, ...g.map((x) => `- ${LEVEL_LABEL[x.level as keyof typeof LEVEL_LABEL] ?? x.level} ${x.grp} ${x.year}: ${x.current_pct ?? "?"}% → ${x.target_pct}%`)].join("\n");
  }
  async function exportPdf() {
    const { exportPlanPdf } = await import("@/lib/plan-pdf");
    await exportPlanPdf(toMarkdown(), { sector: wf.data?.sector ?? undefined, employees: String(emps.data?.length ?? ""), startDate: hdr.start_date, submissionDate: "", planEnd: hdr.end_date });
  }
  function toWord() {
    const KEY = "ddhs-ee-plan-draft";
    let s: { v?: Record<string, string>; goals?: unknown } = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* ignore */ }
    const v = { ...(s.v ?? {}),
      sector: wf.data?.sector ?? s.v?.["sector"] ?? "", employees: String(emps.data?.length ?? ""), startDate: hdr.start_date, endDate: hdr.end_date,
      objectives: (objectives.data ?? []).map((x) => `${x.year}: ${x.objective}`).join("\n"),
      barriers: (barriers.data ?? []).map((x) => `${x.category}: ${x.description}${x.affected_groups ? ` (affects ${x.affected_groups})` : ""}`).join("\n"),
      measures: (measures.data ?? []).map((x) => `${x.measure}${x.owner ? ` — owner: ${x.owner}` : ""}`).join("\n"),
      timetable: (measures.data ?? []).map((x) => `${x.due_date ?? "TBC"}: ${x.measure}${x.milestones ? ` (milestones: ${x.milestones.replace(/\n/g, "; ")})` : ""}`).join("\n"),
    };
    localStorage.setItem(KEY, JSON.stringify({ ...s, v }));
    void nav({ to: "/document" });
  }

  const [nb, setNb] = useState({ category: BARRIER_CATS[0]!, description: "", affected_groups: "" });
  const [ng, setNg] = useState({ level: "top", grp: "African F", year: String(startYear), current_pct: "", target_pct: "" });
  const [no, setNo] = useState({ year: String(startYear), objective: "" });
  const [nm, setNm] = useState({ measure: "", owner: "", milestones: "", due_date: "", barrier_id: "" });
  const bName = (id: string | null) => barriers.data?.find((b) => b.id === id)?.category ?? "";
  const today = todayIso();
  const doneN = (measures.data ?? []).filter((m) => m.status === "Done").length;

  return (
    <main className="min-h-screen bg-background px-6 py-10 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <AppNav />
        <h1 className="font-[Fraunces] text-[40px] leading-tight">EEA13 implementation plan</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">Barriers, numerical goals, annual objectives and measures with owners and due dates. Measure deadlines appear in the <Link to="/calendar" className="text-primary hover:underline">compliance calendar</Link> and the daily reminder email.</p>
        {err && <p role="alert" className="mt-4 text-[13px] text-destructive">{err}</p>}

        <section className={`${card} mt-8 flex flex-wrap items-end gap-3`} aria-label="Plan details">
          <label className="min-w-[240px] flex-1 text-[12px]"><span className={mono}>Plan title</span><input className={`${input} mt-1`} maxLength={150} value={hdr.title} onChange={(e) => setHdr({ ...hdr, title: e.target.value })} /></label>
          <label className="text-[12px]"><span className={mono}>Start</span><input type="date" className={`${input} mt-1`} value={hdr.start_date} onChange={(e) => setHdr({ ...hdr, start_date: e.target.value })} /></label>
          <label className="text-[12px]"><span className={mono}>End (1–5 years)</span><input type="date" className={`${input} mt-1`} value={hdr.end_date} onChange={(e) => setHdr({ ...hdr, end_date: e.target.value })} /></label>
          <button className={primaryBtn} disabled={!pid || saveHdr.isPending} onClick={() => saveHdr.mutate()}>Save</button>
          <button className={btn} onClick={() => void exportPdf()}>Export PDF</button>
          <button className={btn} onClick={toWord}>Open in Word builder</button>
        </section>

        <section className={`${card} mt-6`} aria-label="Barriers">
          <p className={mono}>1 · Barriers (s19 analysis) · {barriers.data?.length ?? 0}</p>
          <ul className="mt-3 divide-y divide-line/40">{(barriers.data ?? []).map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 py-2 text-[14px]"><span><span className="font-medium">{b.category}</span> — {b.description}{b.affected_groups && <span className="text-muted"> · affects {b.affected_groups}</span>}</span><button className="text-[12px] text-muted hover:text-destructive" onClick={() => del.mutate({ t: "plan_barriers", id: b.id })}>Delete</button></li>))}</ul>
          <form className="mt-3 grid gap-2 sm:grid-cols-[200px_1fr_200px_auto]" onSubmit={(e) => { e.preventDefault(); if (nb.description) { ins.mutate({ t: "plan_barriers", row: { ...nb, affected_groups: nb.affected_groups || null } }); setNb({ ...nb, description: "", affected_groups: "" }); } }}>
            <select className={input} value={nb.category} onChange={(e) => setNb({ ...nb, category: e.target.value })}>{BARRIER_CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <input className={input} placeholder="Describe the barrier" maxLength={2000} value={nb.description} onChange={(e) => setNb({ ...nb, description: e.target.value })} />
            <input className={input} placeholder="Affected groups" maxLength={200} value={nb.affected_groups} onChange={(e) => setNb({ ...nb, affected_groups: e.target.value })} />
            <button className={btn}>Add</button>
          </form>
        </section>

        <section className={`${card} mt-6`} aria-label="Numerical goals">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className={mono}>2 · Numerical goals (s20(2)(c))</p><button className={btn} disabled={prefill.isPending} onClick={() => prefill.mutate()}>{prefill.isPending ? "Working…" : "Pre-fill from EEA12 gaps"}</button></div>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-[13px]">
            <thead><tr className="text-left">{["Level", "Group", "Year", "Current", "Target", ""].map((h) => <th key={h} className={`${mono} py-2 pr-3`}>{h}</th>)}</tr></thead>
            <tbody>{(goals.data ?? []).map((g) => (
              <tr key={g.id} className="border-t border-line/40"><td className="py-1.5 pr-3">{LEVEL_LABEL[g.level as keyof typeof LEVEL_LABEL] ?? g.level}</td><td className="pr-3">{g.grp}</td><td className="pr-3">{g.year}</td><td className="pr-3">{g.current_pct ?? "—"}%</td><td className="pr-3 font-medium">{g.target_pct}%</td><td><button className="text-[12px] text-muted hover:text-destructive" onClick={() => del.mutate({ t: "plan_goals", id: g.id })}>Delete</button></td></tr>))}</tbody>
          </table></div>
          <form className="mt-3 grid gap-2 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); const t = parseFloat(ng.target_pct); if (!isNaN(t)) ins.mutate({ t: "plan_goals", row: { level: ng.level, grp: ng.grp, year: Number(ng.year), current_pct: ng.current_pct ? parseFloat(ng.current_pct) : null, target_pct: t } }); }}>
            <select className={input} value={ng.level} onChange={(e) => setNg({ ...ng, level: e.target.value })}>{ALL_LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <input className={input} placeholder="Group (e.g. African F)" maxLength={40} value={ng.grp} onChange={(e) => setNg({ ...ng, grp: e.target.value })} />
            <input className={input} inputMode="numeric" placeholder="Year" value={ng.year} onChange={(e) => setNg({ ...ng, year: e.target.value })} />
            <input className={input} inputMode="decimal" placeholder="Current %" value={ng.current_pct} onChange={(e) => setNg({ ...ng, current_pct: e.target.value })} />
            <input className={input} inputMode="decimal" placeholder="Target %" value={ng.target_pct} onChange={(e) => setNg({ ...ng, target_pct: e.target.value })} />
            <button className={btn}>Add goal</button>
          </form>
        </section>

        <section className={`${card} mt-6`} aria-label="Annual objectives">
          <p className={mono}>3 · Annual objectives (s20(2)(a))</p>
          <ul className="mt-3 divide-y divide-line/40">{(objectives.data ?? []).map((o) => (
            <li key={o.id} className="flex justify-between gap-3 py-2 text-[14px]"><span><span className={`${mono} mr-2`}>{o.year}</span>{o.objective}</span><button className="text-[12px] text-muted hover:text-destructive" onClick={() => del.mutate({ t: "plan_objectives", id: o.id })}>Delete</button></li>))}</ul>
          <form className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (no.objective) { ins.mutate({ t: "plan_objectives", row: { year: Number(no.year), objective: no.objective } }); setNo({ ...no, objective: "" }); } }}>
            <select className={input} value={no.year} onChange={(e) => setNo({ ...no, year: e.target.value })}>{years.map((y) => <option key={y}>{y}</option>)}</select>
            <input className={input} placeholder="Objective for this year" maxLength={1000} value={no.objective} onChange={(e) => setNo({ ...no, objective: e.target.value })} />
            <button className={btn}>Add</button>
          </form>
        </section>

        <section className={`${card} mt-6`} aria-label="Measures">
          <p className={mono}>4 · Affirmative action measures (s20(2)(b)) · {doneN}/{measures.data?.length ?? 0} done</p>
          <ul className="mt-3 divide-y divide-line/40">{(measures.data ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 text-[14px]">
              <div className="min-w-[240px] flex-1"><p>{m.measure}</p><p className="text-[12px] text-muted">{m.owner || "No owner"}{m.barrier_id ? ` · addresses ${bName(m.barrier_id)}` : ""}{m.milestones ? ` · ${m.milestones}` : ""}</p></div>
              <input type="date" aria-label="Due date" className={`rounded-lg border border-line/70 bg-panel/60 px-2 py-1.5 text-[13px] ${m.due_date && m.due_date < today && m.status !== "Done" ? "text-destructive" : ""}`} value={m.due_date ?? ""} onChange={(e) => upd.mutate({ t: "plan_measures", id: m.id, row: { due_date: e.target.value || null, reminded_on: null } })} />
              <select aria-label="Status" className="rounded-lg border border-line/70 bg-panel/60 px-2 py-1.5 text-[13px]" value={m.status} onChange={(e) => upd.mutate({ t: "plan_measures", id: m.id, row: { status: e.target.value } })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <button className="text-[12px] text-muted hover:text-destructive" onClick={() => del.mutate({ t: "plan_measures", id: m.id })}>Delete</button>
            </li>))}</ul>
          <form className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_160px_1fr_150px_180px_auto]" onSubmit={(e) => { e.preventDefault(); if (nm.measure) { ins.mutate({ t: "plan_measures", row: { measure: nm.measure, owner: nm.owner || null, milestones: nm.milestones || null, due_date: nm.due_date || null, barrier_id: nm.barrier_id || null } }); setNm({ measure: "", owner: "", milestones: "", due_date: "", barrier_id: "" }); } }}>
            <input className={input} placeholder="Measure" maxLength={1000} value={nm.measure} onChange={(e) => setNm({ ...nm, measure: e.target.value })} />
            <input className={input} placeholder="Owner" maxLength={100} value={nm.owner} onChange={(e) => setNm({ ...nm, owner: e.target.value })} />
            <input className={input} placeholder="Milestones" maxLength={2000} value={nm.milestones} onChange={(e) => setNm({ ...nm, milestones: e.target.value })} />
            <input type="date" aria-label="Due date" className={input} value={nm.due_date} onChange={(e) => setNm({ ...nm, due_date: e.target.value })} />
            <select className={input} aria-label="Barrier" value={nm.barrier_id} onChange={(e) => setNm({ ...nm, barrier_id: e.target.value })}><option value="">Barrier (optional)</option>{(barriers.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.category}</option>)}</select>
            <button className={btn}>Add</button>
          </form>
        </section>
        <p className="mt-6 text-[12px] text-muted">Guidance only, not legal advice.</p>
      </div>
    </main>
  );
}
