import { fetchAllEmployees } from "@/lib/employees";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { authFetch } from "@/lib/auth-fetch";
import { AppNav } from "@/components/AppNav";
import { btn, card, daysTo, input, mono, must, primaryBtn } from "@/lib/ui";
import { GAZETTE_REF, SECTOR_NAMES } from "@/lib/sector-targets";
import {
  ALL_LEVELS,
  COLS,
  LEVEL_LABEL,
  TARGET_LEVELS,
  activeOn,
  eea12,
  representation,
  rowTotal,
  validate,
  type Employee,
  type Grid,
} from "@/lib/eea12";
import { saveResult } from "@/lib/saved-results";

export const Route = createFileRoute("/_authenticated/dg-review")({
  head: () => ({
    meta: [
      { title: "DG Pack Review — DDHS Equity Intelligence" },
      { name: "description", content: "Check your EEA2, EEA4, EEA12 and EEA13 submission pack for missing figures and inconsistencies before it goes to the Director-General." },
      { property: "og:title", content: "DG Pack Review — DDHS Equity Intelligence" },
      { property: "og:description", content: "A pre-submission check of your Employment Equity pack: blocking gaps, inconsistencies and what to fix first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DgReviewPage,
});

type State = "ok" | "warn" | "block";
type Item = { group: string; label: string; state: State; detail: string };

const STATE_LABEL: Record<State, string> = { ok: "Ready", warn: "Check", block: "Missing" };
const STATE_CLASS: Record<State, string> = { ok: "text-accent", warn: "text-primary", block: "text-destructive" };

function defaultPeriod() {
  const d = new Date();
  const y = d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
  return { from: `${y - 1}-10-01`, to: `${y}-09-30` };
}

function nextJan15() {
  const d = new Date();
  const y = d.getMonth() === 0 && d.getDate() <= 15 ? d.getFullYear() : d.getFullYear() + 1;
  return `${y}-01-15`;
}

const gridText = (title: string, g: Grid) =>
  `${title}\n` + ALL_LEVELS.map(([l, label]) => `${label}: ` + COLS.map((c) => `${c}=${g[l][c]}`).join(" ") + ` total=${rowTotal(g[l])}`).join("\n");

const gridSum = (g: Grid) => ALL_LEVELS.reduce((s, [l]) => s + rowTotal(g[l]), 0);

function DgReviewPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(defaultPeriod);
  const [sectorPick, setSectorPick] = useState<string | null>(null);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const ac = useRef<AbortController | null>(null);

  const emps = useQuery({ queryKey: ["employees"], queryFn: () => fetchAllEmployees<Employee>() });
  const wf = useQuery({
    queryKey: ["wf"],
    queryFn: () => must(supabase.from("workforce_profiles").select("sector").maybeSingle()) as Promise<{ sector: string | null } | null>,
  });
  const saveSector = useMutation({
    mutationFn: (s: string) => must(supabase.from("workforce_profiles").upsert({ sector: s || null, updated_at: new Date().toISOString() })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wf"] }),
  });
  const sector = sectorPick ?? wf.data?.sector ?? "";

  const me = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => must(supabase.from("profiles").select("company, full_name, job_title, email").maybeSingle()) as Promise<{ company: string | null; full_name: string | null; job_title: string | null; email: string | null } | null>,
  });
  const plan = useQuery({
    queryKey: ["ee-plan"],
    queryFn: () => must(supabase.from("ee_plans").select("title, start_date, end_date").maybeSingle()) as Promise<{ title: string; start_date: string | null; end_date: string | null } | null>,
  });
  const barriers = useQuery({ queryKey: ["plan-barriers"], queryFn: () => must(supabase.from("plan_barriers").select("category, affected_groups")) });
  const goals = useQuery({ queryKey: ["plan-goals"], queryFn: () => must(supabase.from("plan_goals").select("level, grp, year, current_pct, target_pct")) });
  const objectives = useQuery({ queryKey: ["plan-objectives"], queryFn: () => must(supabase.from("plan_objectives").select("year, objective")) });
  const measures = useQuery({ queryKey: ["plan-measures"], queryFn: () => must(supabase.from("plan_measures").select("measure, owner, due_date, status")) });
  const members = useQuery({ queryKey: ["cm-members"], queryFn: () => must(supabase.from("committee_members").select("name, role, represents")) });
  const meetings = useQuery({ queryKey: ["cm-meetings"], queryFn: () => must(supabase.from("committee_meetings").select("meeting_date, title")) });
  const actions = useQuery({ queryKey: ["cm-actions"], queryFn: () => must(supabase.from("committee_actions").select("title, due_date, status")) });
  const evItems = useQuery({ queryKey: ["evidence_items"], queryFn: () => must(supabase.from("evidence_items").select("id, title, category")) });
  const evLinks = useQuery({ queryKey: ["evidence-links"], queryFn: () => must(supabase.from("evidence_links").select("target_type, target_id")) });
  const evFiles = useQuery({
    queryKey: ["evidence-files"],
    queryFn: async () => (await supabase.from("evidence_versions").select("id", { count: "exact", head: true })).count ?? 0,
  });
  const decisionCount = useQuery({
    queryKey: ["decisions-count"],
    queryFn: async () => (await supabase.from("decisions").select("id", { count: "exact", head: true })).count ?? 0,
  });

  const empList = useMemo(() => emps.data ?? [], [emps.data]);
  const r = useMemo(() => eea12(empList, period.from, period.to), [empList, period]);
  const rep = useMemo(() => representation(r.profile, sector || null, r.disability), [r, sector]);
  const q = useMemo(() => validate(empList), [empList]);

  const checks = useMemo<Item[]>(() => {
    const tdy = new Date().toISOString().slice(0, 10);
    const active = empList.filter((e) => activeOn(e, period.to));
    const noLevel = empList.filter((e) => !e.level || !(e.level in LEVEL_LABEL)).length;
    const fn = active.filter((e) => e.foreign_national).length;
    const disPct = r.activeCount ? Math.round((r.disabilityCount / r.activeCount) * 1000) / 10 : 0;
    const movement = gridSum(r.hires) + gridSum(r.promotions) + gridSum(r.terminations);
    const errors = q.issues.filter((i) => i.severity === "error").length;
    const warnings = q.issues.filter((i) => i.severity === "warning").length;
    const ms = measures.data ?? [];
    const noOwner = ms.filter((m) => !m.owner).length;
    const noDue = ms.filter((m) => !m.due_date).length;
    const overdueMs = ms.filter((m) => m.status !== "Done" && m.due_date && m.due_date < tdy).length;
    const goalLevels = new Set((goals.data ?? []).filter((g) => g.grp === "Designated total").map((g) => g.level));
    const gapLevels = rep.levels.filter((l) => (TARGET_LEVELS as string[]).includes(l.level) && l.gap !== null && l.gap < 0).map((l) => l.level);
    const noGoalFor = gapLevels.filter((l) => !goalLevels.has(l));
    const meets = (meetings.data ?? []).filter((m) => m.meeting_date >= period.from && m.meeting_date <= period.to).length;
    const acts = actions.data ?? [];
    const openActs = acts.filter((a) => a.status !== "Done").length;
    const overdueActs = acts.filter((a) => a.status !== "Done" && a.due_date && a.due_date < tdy).length;
    const groups = new Set((members.data ?? []).map((m) => m.represents || m.role || "unspecified")).size;
    const deadline = nextJan15();
    const days = daysTo(deadline);

    return [
      { group: "EEA2 · employer & workforce", label: "Employer details", state: me.data?.company ? "ok" : "block", detail: me.data?.company || "No company name on your profile" },
      { group: "EEA2 · employer & workforce", label: "Sector (s15A)", state: sector ? "ok" : "block", detail: sector || "Choose your sector above" },
      { group: "EEA2 · employer & workforce", label: "Workforce profile as at period end", state: r.activeCount ? "ok" : "block", detail: `${r.activeCount} employees active on ${period.to}` },
      { group: "EEA2 · employer & workforce", label: "Job level on every record", state: noLevel ? "block" : "ok", detail: noLevel ? `${noLevel} employees have no job level and are left out of the tables` : "Every employee has a job level" },
      { group: "EEA2 · employer & workforce", label: "Data quality", state: q.score >= 95 ? "ok" : q.score >= 80 ? "warn" : "block", detail: `${q.score}% clean · ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}` },
      { group: "EEA2 · employer & workforce", label: "Disability figures", state: !r.disabilityCount ? "warn" : rep.disabilityTarget !== undefined && disPct < rep.disabilityTarget ? "warn" : "ok", detail: `${r.disabilityCount} employees with disabilities (${disPct}%${rep.disabilityTarget !== undefined ? ` vs ${rep.disabilityTarget}% target` : " (no sector target chosen)"})` },
      { group: "EEA2 · employer & workforce", label: "Movements in the period", state: movement ? "ok" : "warn", detail: movement ? `${gridSum(r.hires)} hires · ${gridSum(r.promotions)} promotions · ${gridSum(r.terminations)} exits` : "No start, promotion or end dates recorded — the pack will show zero movement" },
      { group: "EEA2 · employer & workforce", label: "Foreign nationals identified", state: "ok", detail: `${fn} foreign national${fn === 1 ? "" : "s"} excluded from designated-group figures` },

      { group: "EEA13 · section 20 plan", label: "Plan on record", state: plan.data ? "ok" : "block", detail: plan.data ? plan.data.title : "No plan saved yet" },
      { group: "EEA13 · section 20 plan", label: "Plan period stated", state: plan.data?.start_date && plan.data?.end_date ? "ok" : "block", detail: plan.data?.start_date && plan.data?.end_date ? `${plan.data.start_date} to ${plan.data.end_date}` : "Add the plan start and end date on the EE Plan page" },
      { group: "EEA13 · section 20 plan", label: "Barriers identified", state: barriers.data?.length ? "ok" : "block", detail: barriers.data?.length ? `${barriers.data.length} barriers recorded` : "No barriers recorded" },
      { group: "EEA13 · section 20 plan", label: "Numerical goals", state: !goals.data?.length ? "block" : noGoalFor.length ? "warn" : "ok", detail: !goals.data?.length ? "No numerical goals recorded" : noGoalFor.length ? `No goal for ${noGoalFor.map((l) => LEVEL_LABEL[l as keyof typeof LEVEL_LABEL] ?? l).join(", ")} despite a shortfall` : `Goals set for every level with a shortfall (${goals.data.length} rows)` },
      { group: "EEA13 · section 20 plan", label: "Annual objectives", state: objectives.data?.length ? "ok" : "block", detail: objectives.data?.length ? `${objectives.data.length} objectives recorded` : "No annual objectives recorded" },
      { group: "EEA13 · section 20 plan", label: "Measures with owners and due dates", state: !ms.length ? "block" : noOwner || noDue ? "warn" : "ok", detail: !ms.length ? "No measures recorded" : `${ms.length} measures · ${noOwner} without an owner · ${noDue} without a due date · ${overdueMs} overdue` },

      { group: "Consultation record", label: "Committee constituted", state: members.data?.length ? "ok" : "block", detail: members.data?.length ? `${members.data.length} members · ${groups} group${groups === 1 ? "" : "s"} represented` : "No committee members recorded" },
      { group: "Consultation record", label: "Meetings in the reporting period", state: meets ? "ok" : "warn", detail: meets ? `${meets} meeting${meets === 1 ? "" : "s"} between ${period.from} and ${period.to}` : "No meetings recorded in the reporting period" },
      { group: "Consultation record", label: "Committee actions closed", state: overdueActs ? "warn" : "ok", detail: acts.length ? `${acts.length} actions · ${openActs} open · ${overdueActs} overdue` : "No actions recorded" },

      { group: "Evidence & governance", label: "Documents held", state: evFiles.data ? "ok" : "warn", detail: `${evFiles.data ?? 0} file${(evFiles.data ?? 0) === 1 ? "" : "s"} across ${evItems.data?.length ?? 0} evidence items` },
      { group: "Evidence & governance", label: "Evidence linked to plan, actions and decisions", state: evLinks.data?.length ? "ok" : "warn", detail: evLinks.data?.length ? `${evLinks.data.length} link${evLinks.data.length === 1 ? "" : "s"}` : "Nothing linked — a reviewer cannot trace a measure to proof" },
      { group: "Evidence & governance", label: "Decisions logged", state: decisionCount.data ? "ok" : "warn", detail: `${decisionCount.data ?? 0} decision${(decisionCount.data ?? 0) === 1 ? "" : "s"} logged` },

      { group: "Submission", label: "EEA4 income differential", state: "warn", detail: "Not held in this workspace — you must compile the income differential separately" },
      { group: "Submission", label: "Time to the statutory deadline", state: days >= 30 ? "ok" : "warn", detail: `${deadline} · ${days} day${days === 1 ? "" : "s"} to go` },
    ];
  }, [empList, period, r, rep, q, me.data, sector, plan.data, barriers.data, goals.data, objectives.data, measures.data, members.data, meetings.data, actions.data, evItems.data, evLinks.data, evFiles.data, decisionCount.data]);

  const blocks = checks.filter((c) => c.state === "block");
  const warns = checks.filter((c) => c.state === "warn");
  const groups = [...new Set(checks.map((c) => c.group))];

  function packText() {
    const tdy = new Date().toISOString().slice(0, 10);
    const disPct = r.activeCount ? Math.round((r.disabilityCount / r.activeCount) * 1000) / 10 : 0;
    const ms = measures.data ?? [];
    const listed = ms.slice(0, 60);
    const parts = [
      `Employer: ${me.data?.company || "not recorded"}. Contact: ${me.data?.full_name || "not recorded"}${me.data?.job_title ? ` (${me.data.job_title})` : ""}${me.data?.email ? ` · ${me.data.email}` : ""}.`,
      `Sector: ${sector || "not specified"}. Reporting period ${period.from} to ${period.to}. EEA2/EEA4 submission due ${nextJan15()}. ${GAZETTE_REF}.`,
      `Active employees on ${period.to}: ${r.activeCount}. With disabilities: ${r.disabilityCount} (${disPct}%${rep.disabilityTarget !== undefined ? `, sector target ${rep.disabilityTarget}%` : ", no sector target"}).`,
      "Column codes: A African, C Coloured, I Indian, W White, M male, F female, FN foreign national.",
      gridText("Workforce profile", r.profile),
      gridText("Employees with disabilities", r.disability),
      gridText("Hires", r.hires),
      gridText("Promotions", r.promotions),
      gridText("Terminations", r.terminations),
      "Representation by level (designated = African/Coloured/Indian men + all women + white men with disabilities; your % vs gazetted target %):\n" +
        rep.levels.map((l) => `${l.level}: staff ${l.total}; male ${l.male}%${l.target ? `/${l.target.male}%` : ""}; female ${l.female}%${l.target ? `/${l.target.female}%` : ""}; total ${l.designated}%${l.target ? `/${l.target.total}%; gap ${l.gap}` : " (no target)"}`).join("\n"),
      `Plan: ${plan.data?.title ?? "none on record"}. Period ${plan.data?.start_date ?? "not stated"} to ${plan.data?.end_date ?? "not stated"}.`,
      `Barriers (${barriers.data?.length ?? 0}): ` + (barriers.data ?? []).map((b) => `${b.category}${b.affected_groups ? ` [${b.affected_groups}]` : ""}`).join("; "),
      `Numerical goals (${goals.data?.length ?? 0}): ` + (goals.data ?? []).map((g) => `${g.level}/${g.grp} ${g.year}: ${g.current_pct ?? "?"}% -> ${g.target_pct}%`).join("; "),
      `Annual objectives (${objectives.data?.length ?? 0}): ` + (objectives.data ?? []).map((o) => `${o.year}: ${o.objective.slice(0, 160)}`).join(" | "),
      `Measures (${ms.length}${ms.length > listed.length ? `, first ${listed.length} shown` : ""}): ` +
        listed.map((m) => `${m.measure.slice(0, 160)} [owner ${m.owner || "none"}; due ${m.due_date || "none"}; ${m.status}]`).join(" | "),
      `Overdue measures at ${tdy}: ${ms.filter((m) => m.status !== "Done" && m.due_date && m.due_date < tdy).length}.`,
      `Consultation: ${(members.data ?? []).length} committee members (${[...new Set((members.data ?? []).map((m) => m.represents || m.role || "unspecified"))].join(", ")}); ` +
        `${(meetings.data ?? []).filter((m) => m.meeting_date >= period.from && m.meeting_date <= period.to).length} meetings in the reporting period; ` +
        `${(actions.data ?? []).length} actions (${(actions.data ?? []).filter((a) => a.status === "Done").length} done, ` +
        `${(actions.data ?? []).filter((a) => a.status !== "Done" && a.due_date && a.due_date < tdy).length} overdue).`,
      `Governance: ${decisionCount.data ?? 0} decisions logged; ${evFiles.data ?? 0} evidence files across ${evItems.data?.length ?? 0} items; ` +
        `${(evLinks.data ?? []).length} links tying evidence to measures, actions or decisions. Evidence by category: ` +
        [...new Set((evItems.data ?? []).map((i) => i.category))].map((c) => `${c}=${(evItems.data ?? []).filter((i) => i.category === c).length}`).join(", "),
      "EEA4 income differential: not held in this workspace.",
      `Pre-check list (state: figure or document that is missing):\n` + checks.map((c) => `${c.state === "block" ? "MISSING" : c.state === "warn" ? "CHECK" : "READY"} · ${c.group} · ${c.label}: ${c.detail}`).join("\n"),
    ];
    const text = parts.join("\n\n");
    return text.length > 39000 ? text.slice(0, 39000) + "\n\n[Pack trimmed for length.]" : text;
  }

  async function run() {
    if (!r.activeCount) return setErr("Import your workforce first — there is nothing to review yet.");
    setErr(""); setOut(""); setSaved(false); setBusy(true);
    ac.current = new AbortController();
    let failed = false;
    try {
      const res = await authFetch("/api/dg-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.current.signal,
        body: JSON.stringify({ sector: sector || "Not specified", period: `${period.from} to ${period.to}`, pack: packText() }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "The review request failed.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l) continue;
          const m = JSON.parse(l);
          if (m.t) { full += m.t; setOut((o) => o + m.t); }
          if (m.error) { failed = true; setErr(m.error); }
        }
      }
      if (!failed && full.length > 40) {
        await must(supabase.from("evidence_items").insert({
          title: `DG pack review ${period.from} – ${period.to}`.slice(0, 200),
          category: "submission",
          body: full.slice(0, 100000),
          description: `Pre-submission review of the EEA2/EEA4/EEA12/EEA13 pack for ${r.activeCount} employees${sector ? `, ${sector} sector` : ""}. ${blocks.length} blocking gap${blocks.length === 1 ? "" : "s"} at the time of review (guidance only).`.slice(0, 2000),
        }));
        qc.invalidateQueries({ queryKey: ["evidence_items"] });
        void saveResult("dg", full);
        setSaved(true);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    }
    setBusy(false);
  }

  const loading = !emps.isSuccess || !wf.isSuccess;

  return (
    <main className="min-h-screen bg-background px-6 py-10 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <AppNav />
        <p className={mono}>Pre-submission check · s21 reporting</p>
        <h1 className="mt-2 font-[Fraunces] text-[40px] leading-tight">DG pack review</h1>
        <p className="mt-2 max-w-[70ch] text-[15px] text-muted">
          Assembles your EEA2 workforce profile, EEA12 analysis, section 20 plan and consultation record, then reviews the pack the way the Director-General's
          office would read it — what is missing, what does not add up, and what to fix before it goes in.
        </p>

        <section className={`${card} mt-8 flex flex-wrap items-end gap-3`}>
          <label className="text-[12px]"><span className={mono}>Period from</span><input type="date" className={`${input} mt-1`} value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} /></label>
          <label className="text-[12px]"><span className={mono}>To (profile date)</span><input type="date" className={`${input} mt-1`} value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} /></label>
          <label className="text-[12px]"><span className={mono}>Sector (s15A)</span>
            <select className={`${input} mt-1`} value={sector} onChange={(e) => { setSectorPick(e.target.value); saveSector.mutate(e.target.value); }}>
              <option value="">Choose your sector…</option>{SECTOR_NAMES.map((s) => <option key={s}>{s}</option>)}
            </select></label>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className={`text-[13px] ${blocks.length ? "text-destructive" : warns.length ? "text-primary" : "text-accent"}`}>
              {blocks.length} blocking · {warns.length} to check
            </span>
            {busy ? <button className={btn} onClick={() => ac.current?.abort()}>Stop</button> : <button className={primaryBtn} disabled={loading || !r.activeCount} onClick={() => void run()}>Review my pack</button>}
          </div>
        </section>

        {!loading && !r.activeCount && (
          <p className={`${card} mt-6 text-[14px]`}>No employee data yet. <Link to="/workforce" className="text-primary hover:underline">Import your workforce</Link> first.</p>
        )}

        <section className={`${card} mt-6`} aria-label="What is in the pack">
          <p className={mono}>What is in your pack</p>
          {groups.map((g) => (
            <div key={g} className="mt-5">
              <p className="font-[Fraunces] text-[17px]">{g}</p>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {checks.filter((c) => c.group === g).map((c) => (
                  <li key={c.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line/40 pb-1.5">
                    <span>{c.label}<span className="block text-[12px] text-muted">{c.detail}</span></span>
                    <span className={`${mono} ${STATE_CLASS[c.state]}`}>{STATE_LABEL[c.state]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-4 text-[12px] text-muted">
            This is a readiness check against your own records, not a legal opinion. The income differential (EEA4) and your company registration and
            contact details are not held here and must be completed on the departmental forms.
          </p>
        </section>

        <section className={`${card} mt-6`} aria-label="Review" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={mono}>Director-General's view</p>
            {out && !busy && (
              <button onClick={() => { navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`${btn} text-[12px]`}>{copied ? "Copied" : "Copy"}</button>
            )}
          </div>
          {err && <p role="alert" className="mt-3 text-[13px] text-destructive">{err}</p>}
          {saved && <p className="mt-3 text-[13px] text-accent">Saved to the <Link to="/evidence" className="underline">evidence repository</Link> and your dashboard.</p>}
          {!out && !err && <p className="mt-3 text-[14px] text-muted">{busy ? "Reading your pack…" : "Run the review to see what a reviewer would ask."}</p>}
          {out && <div className="mt-4 max-w-none text-[14px] leading-relaxed [&_h2]:font-[Fraunces] [&_h2]:mt-6 [&_h2]:text-[19px] [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_strong]:font-semibold"><ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown></div>}
          <p className="mt-6 border-t border-line/60 pt-3 text-[11px] text-muted">Guidance only — not legal advice.</p>
        </section>
      </div>
    </main>
  );
}
