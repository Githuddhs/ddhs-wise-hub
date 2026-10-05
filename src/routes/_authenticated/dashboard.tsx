import { fetchAllEmployees } from "@/lib/employees";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { LEVELS, SECTOR_NAMES, GAZETTE_REF } from "@/lib/sector-targets";
import { GROUPS, analyse, parseRows, templateCsv, type Counts, type GroupKey, type LevelKey } from "@/lib/workforce";
import { TOOL_LABEL, type Tool } from "@/lib/saved-results";
import { AppNav } from "@/components/AppNav";
import { eea12, representation, validate, LEVEL_LABEL, type Employee } from "@/lib/eea12";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Equity Intelligence Dashboard — DDHS" },
      { name: "description", content: "Your workforce against gazetted sector targets, committee status, compliance deadlines and saved AI results in one view." },
      { property: "og:title", content: "Equity Intelligence Dashboard — DDHS" },
      { property: "og:description", content: "Workforce vs s15A targets, committee status, deadlines and saved results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const card = "rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl";
const mono = "font-[JetBrains_Mono] text-[11px] uppercase tracking-wider text-muted";
const input = "w-full rounded-lg border border-line/70 bg-panel/60 px-3 py-2 text-[14px]";
const btn = "rounded-full border border-line/70 px-4 py-2 text-[13px] hover:bg-panel";

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

function nextJan15() {
  const d = new Date(); const y = d.getMonth() === 0 && d.getDate() <= 15 ? d.getFullYear() : d.getFullYear() + 1;
  return `${y}-01-15`;
}
const daysTo = (iso: string) => Math.ceil((new Date(iso + "T00:00:00").getTime() - Date.now()) / 86400000);

function Dashboard() {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const onError = (e: Error) => setErr(e.message);
  const profile = useQuery({ queryKey: ["wf"], queryFn: () => must(supabase.from("workforce_profiles").select("*").maybeSingle()) as Promise<{ sector: string | null; counts: unknown } | null> });
  const actions = useQuery({ queryKey: ["cm-actions"], queryFn: () => must(supabase.from("committee_actions").select("*")) });
  const meetings = useQuery({ queryKey: ["cm-meetings"], queryFn: () => must(supabase.from("committee_meetings").select("*").order("meeting_date")) });
  const members = useQuery({ queryKey: ["cm-members"], queryFn: () => must(supabase.from("committee_members").select("id")) });
  const deadlines = useQuery({ queryKey: ["deadlines"], queryFn: () => must(supabase.from("compliance_deadlines").select("*").order("due_date")) });
  const results = useQuery({ queryKey: ["results"], queryFn: () => must(supabase.from("saved_results").select("id,tool,title,created_at").order("created_at", { ascending: false }).limit(30)) });

  const emps = useQuery({ queryKey: ["employees"], queryFn: () => fetchAllEmployees<Employee>() });
  const measures = useQuery({ queryKey: ["all-measures"], queryFn: () => must(supabase.from("plan_measures").select("id,measure,status,due_date")) });
  const goals = useQuery({ queryKey: ["all-goals"], queryFn: () => must(supabase.from("plan_goals").select("level,grp,year,target_pct")) });
  const decisions = useQuery({ queryKey: ["decisions"], queryFn: () => must(supabase.from("decisions").select("id")) });
  const links = useQuery({ queryKey: ["evidence-links"], queryFn: () => must(supabase.from("evidence_links").select("target_type,target_id")) });
  const evCount = useQuery({ queryKey: ["evidence-count"], queryFn: async () => { const { count } = await supabase.from("evidence_items").select("id", { count: "exact", head: true }); return count ?? 0; } });
  const [sector, setSector] = useState("");
  const [counts, setCounts] = useState<Counts>({});
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (profile.data) { setSector(profile.data.sector ?? ""); setCounts((profile.data.counts ?? {}) as Counts); }
    else if (profile.status === "success") setEditing(true);
  }, [profile.data, profile.isSuccess]);

  const saveWf = useMutation({
    mutationFn: () => must(supabase.from("workforce_profiles").upsert({ sector: sector || null, counts, updated_at: new Date().toISOString() }).select()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wf"] }); setEditing(false); }, onError,
  });
  const addDeadline = useMutation({ mutationFn: (v: { title: string; due_date: string }) => must(supabase.from("compliance_deadlines").insert(v)), onSuccess: () => qc.invalidateQueries({ queryKey: ["deadlines"] }), onError });
  const delDeadline = useMutation({ mutationFn: (id: string) => must(supabase.from("compliance_deadlines").delete().eq("id", id)), onSuccess: () => qc.invalidateQueries({ queryKey: ["deadlines"] }), onError });
  const delResult = useMutation({ mutationFn: (id: string) => must(supabase.from("saved_results").delete().eq("id", id)), onSuccess: () => qc.invalidateQueries({ queryKey: ["results"] }), onError });

  const setCell = (l: LevelKey, g: GroupKey, v: string) => setCounts((c) => ({ ...c, [l]: { ...(c[l] ?? {}), [g]: Math.max(0, parseInt(v, 10) || 0) } }));

  async function onFile(f: File) {
    setErr("");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0] ?? ""];
      if (!ws) throw new Error("The file has no sheets.");
      const parsed = parseRows(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }));
      if (!Object.keys(parsed).length) throw new Error("No job levels found. Use the template layout.");
      setCounts(parsed); setEditing(true);
    } catch (e) { setErr((e as Error).message); }
  }
  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([templateCsv()], { type: "text/csv" }));
    a.download = "workforce-template.csv"; a.click();
  }

  const a = analyse(counts, sector || null);
  const empList = emps.data ?? [];
  const hasEmps = empList.length > 0;
  const live = hasEmps ? (() => { const x = eea12(empList, "1900-01-01", new Date().toISOString().slice(0, 10)); return representation(x.profile, sector || null, x.disability); })() : null;
  const quality = hasEmps ? validate(empList) : null;
  const ms = measures.data ?? [];
  const tdy = new Date().toISOString().slice(0, 10);
  const msOverdue = ms.filter((m) => m.status !== "Done" && m.due_date && m.due_date < tdy).length;
  const govTargets = ms.length + (actions.data?.length ?? 0) + (decisions.data?.length ?? 0);
  const covered = new Set((links.data ?? []).map((l) => l.target_type + l.target_id)).size;
  const heldMeetings = (meetings.data ?? []).filter((m) => m.meeting_date <= tdy).length;
  const goalFor = (lvl: string) => (goals.data ?? []).filter((g) => g.level === lvl && g.grp === "Designated total").sort((x, y) => x.year - y.year).find((g) => g.year >= new Date().getFullYear());
  const acts = actions.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const done = acts.filter((x) => x.status === "Done").length;
  const overdue = acts.filter((x) => x.status !== "Done" && x.due_date && x.due_date < today).length;
  const nextMeeting = (meetings.data ?? []).find((x) => x.meeting_date >= today);
  const openActs = acts.filter((x) => x.status !== "Done" && x.due_date).map((x) => ({ id: "a" + x.id, title: `Committee action: ${x.title}`, due_date: x.due_date as string, own: false }));
  const calendar = [
    { id: "eea2", title: "EEA2 & EEA4 statutory report due (s21)", due_date: nextJan15(), own: false },
    ...(nextMeeting ? [{ id: "m", title: `Committee meeting: ${nextMeeting.title}`, due_date: nextMeeting.meeting_date, own: false }] : []),
    ...openActs,
    ...(deadlines.data ?? []).map((d) => ({ id: d.id, title: d.title, due_date: d.due_date, own: true })),
  ].sort((x, y) => x.due_date.localeCompare(y.due_date));
  const [dl, setDl] = useState({ title: "", due_date: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = useQuery({ queryKey: ["result", openId], enabled: !!openId, queryFn: () => must(supabase.from("saved_results").select("content").eq("id", openId as string).single()) as Promise<{ content: string }> });

  return (
    <main className="min-h-screen bg-background px-6 py-12 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <AppNav />
        <h1 className=" font-[Fraunces] text-[40px] leading-tight">Equity Intelligence Dashboard</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">Your workforce against the gazetted sector targets, committee status, deadlines and saved results. Saved to your account.</p>
        {err && <p role="alert" className="mt-4 text-[13px] text-destructive">{err}</p>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Executive summary">
          <Link to="/workforce" className={`${card} block hover:border-primary/60`}><p className={mono}>Data quality</p><p className={`mt-1 font-[Fraunces] text-[34px] ${quality && quality.score < 90 ? "text-destructive" : ""}`}>{quality ? `${quality.score}%` : "—"}</p><p className="text-[12px] text-muted">{hasEmps ? `${empList.length} employee records` : "No employee data yet"}</p></Link>
          <Link to="/calendar" className={`${card} block hover:border-primary/60`}><p className={mono}>Overdue actions</p><p className={`mt-1 font-[Fraunces] text-[34px] ${overdue + msOverdue ? "text-destructive" : ""}`}>{overdue + msOverdue}</p><p className="text-[12px] text-muted">{overdue} committee · {msOverdue} plan measures</p></Link>
          <Link to="/ee-plan" className={`${card} block hover:border-primary/60`}><p className={mono}>Plan measures done</p><p className="mt-1 font-[Fraunces] text-[34px]">{ms.filter((m) => m.status === "Done").length}/{ms.length}</p><p className="text-[12px] text-muted">{goals.data?.length ?? 0} numerical goals set</p></Link>
          <Link to="/evidence" className={`${card} block hover:border-primary/60`}><p className={mono}>Governance</p><p className="mt-1 font-[Fraunces] text-[34px]">{govTargets ? `${Math.round((covered / govTargets) * 100)}%` : "—"}</p><p className="text-[12px] text-muted">evidence coverage · {heldMeetings} meetings held · {decisions.data?.length ?? 0} decisions · {evCount.data ?? 0} documents</p></Link>
        </div>

        {live && (
          <section className={`${card} mt-6`} aria-label="Target progress">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className={mono}>Target progress · live employee data</p><Link to="/analysis" className="text-[13px] text-primary hover:underline">Full EEA12 analysis →</Link></div>
            {!sector && <p className="mt-2 text-[13px] text-muted">Choose your sector below to compare against the gazetted targets.</p>}
            <div className="mt-3 overflow-x-auto"><table className="w-full text-[14px]">
              <thead><tr className="text-left">{["Level", "Staff", "Designated now", "Next plan goal", "Sector target", "Gap to target"].map((h) => <th key={h} className={`${mono} py-2 pr-4`}>{h}</th>)}</tr></thead>
              <tbody>{live.levels.filter((l) => l.target || l.total).map((l) => { const g = goalFor(l.level); return (
                <tr key={l.level} className="border-t border-line/50"><td className="py-2 pr-4">{LEVEL_LABEL[l.level]}</td><td className="pr-4">{l.total}</td><td className="pr-4">{l.designated}%</td><td className="pr-4">{g ? `${g.target_pct}% (${g.year})` : "—"}</td><td className="pr-4">{l.target ? `${l.target.total}%` : "—"}</td>
                  <td className={l.gap === null ? "text-muted" : l.gap < 0 ? "text-destructive" : "text-accent"}>{l.gap === null ? "—" : l.gap < 0 ? `${l.gap} pts` : "On target"}</td></tr>); })}</tbody>
            </table></div>
          </section>
        )}

        <section className={`${card} mt-6`} aria-label="Workforce vs sector targets">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={mono}>{hasEmps ? "Sector & manual totals (fallback)" : "Workforce vs s15A sector targets"}</p>
              <p className="mt-1 text-[13px] text-muted">{a.total} employees in the four target levels · {GAZETTE_REF}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Sector" className={`${input} w-auto`} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Choose your sector…</option>
                {SECTOR_NAMES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className={btn} onClick={() => setEditing((v) => !v)}>{editing ? "Hide numbers" : "Edit numbers"}</button>
              <label className={`${btn} cursor-pointer`}>Upload spreadsheet<input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} /></label>
              <button className={btn} onClick={downloadTemplate}>Template</button>
              <button className="rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-50" disabled={saveWf.isPending} onClick={() => saveWf.mutate()}>{saveWf.isPending ? "Saving…" : "Save"}</button>
            </div>
          </div>

          {editing && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr><th className={`${mono} py-2 text-left`}>Level</th>{GROUPS.map(([g, l]) => <th key={g} className={`${mono} px-1 py-2`}>{l}</th>)}</tr></thead>
                <tbody>{LEVELS.map(([k, label]) => (
                  <tr key={k} className="border-t border-line/50">
                    <td className="py-2 pr-3">{label}</td>
                    {GROUPS.map(([g]) => <td key={g} className="px-1"><input aria-label={`${label} ${g}`} inputMode="numeric" className={`${input} w-16 px-2 text-center`} value={counts[k]?.[g] ?? ""} onChange={(e) => setCell(k, g, e.target.value)} /></td>)}
                  </tr>))}</tbody>
              </table>
              <p className="mt-2 text-[12px] text-muted">"With disability" is a count of people already included in the other columns.</p>
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead><tr className="text-left">{["Level", "Staff", "Designated male", "Designated female", "Designated total", "Gap"].map((h) => <th key={h} className={`${mono} py-2 pr-4`}>{h}</th>)}</tr></thead>
              <tbody>
                {a.levels.map((l) => {
                  const gap = l.target ? Math.round((l.designated - l.target.total) * 10) / 10 : null;
                  const cell = (v: number, t?: number) => <span>{v}%{t !== undefined && <span className="text-muted"> / {t}%</span>}</span>;
                  return (
                    <tr key={l.key} className="border-t border-line/50">
                      <td className="py-2.5 pr-4">{l.label}</td>
                      <td className="pr-4">{l.total}</td>
                      <td className="pr-4">{cell(l.male, l.target?.male)}</td>
                      <td className="pr-4">{cell(l.female, l.target?.female)}</td>
                      <td className="pr-4">{cell(l.designated, l.target?.total)}</td>
                      <td className={gap === null || !l.total ? "text-muted" : gap < 0 ? "text-destructive" : "text-accent"}>{gap === null || !l.total ? "—" : gap < 0 ? `${gap} pts` : "On target"}</td>
                    </tr>);
                })}
                <tr className="border-t border-line/50">
                  <td className="py-2.5 pr-4">People with disabilities (all levels)</td><td /><td /><td />
                  <td className="pr-4">{a.disability}%{a.disabilityTarget !== undefined && <span className="text-muted"> / {a.disabilityTarget}%</span>}</td>
                  <td className={a.disabilityTarget === undefined || !a.total ? "text-muted" : a.disability < a.disabilityTarget ? "text-destructive" : "text-accent"}>{a.disabilityTarget === undefined || !a.total ? "—" : a.disability < a.disabilityTarget ? `${Math.round((a.disability - a.disabilityTarget) * 10) / 10} pts` : "On target"}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-muted">Shown as your figure / gazetted target. Designated = African, Coloured and Indian people, and all women, excluding foreign nationals. Guidance only, not legal advice.</p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className={card} aria-label="Committee overview">
            <div className="flex items-center justify-between"><p className={mono}>EE committee</p><Link to="/committee" className="text-[13px] text-primary hover:underline">Open tracker →</Link></div>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div><dt className={mono}>Members</dt><dd className="mt-1 font-[Fraunces] text-[28px]">{members.data?.length ?? 0}</dd></div>
              <div><dt className={mono}>Actions done</dt><dd className="mt-1 font-[Fraunces] text-[28px]">{done}/{acts.length}</dd></div>
              <div><dt className={mono}>Overdue</dt><dd className={`mt-1 font-[Fraunces] text-[28px] ${overdue ? "text-destructive" : ""}`}>{overdue}</dd></div>
              <div><dt className={mono}>Next meeting</dt><dd className="mt-1 text-[15px]">{nextMeeting ? `${nextMeeting.meeting_date} · ${nextMeeting.title}` : "None scheduled"}</dd></div>
            </dl>
          </section>

          <section className={card} aria-label="Compliance calendar">
            <div className="flex items-center justify-between"><p className={mono}>Compliance calendar</p><Link to="/calendar" className="text-[13px] text-primary hover:underline">Open calendar →</Link></div>
            <ul className="mt-4 space-y-2 text-[14px]">
              {calendar.slice(0, 8).map((c) => { const d = daysTo(c.due_date); return (
                <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line/40 pb-2">
                  <span>{c.title}<span className="block text-[12px] text-muted">{c.due_date}</span></span>
                  <span className="flex items-center gap-2"><span className={`${mono} ${d < 0 ? "text-destructive" : d <= 30 ? "text-primary" : ""}`}>{d < 0 ? `${-d}d late` : `${d}d`}</span>
                  {c.own && <button aria-label="Remove deadline" className="text-muted hover:text-destructive" onClick={() => delDeadline.mutate(c.id)}>×</button>}</span>
                </li>); })}
            </ul>
            <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (dl.title && dl.due_date) { addDeadline.mutate(dl); setDl({ title: "", due_date: "" }); } }}>
              <input className={`${input} flex-1`} placeholder="Add a deadline" maxLength={150} value={dl.title} onChange={(e) => setDl({ ...dl, title: e.target.value })} />
              <input type="date" className={`${input} w-auto`} value={dl.due_date} onChange={(e) => setDl({ ...dl, due_date: e.target.value })} />
              <button className={btn}>Add</button>
            </form>
          </section>
        </div>

        <section className={`${card} mt-6`} aria-label="Saved results">
          <p className={mono}>Saved AI results</p>
          {!results.data?.length ? <p className="mt-3 text-[14px] text-muted">Results from the Gap Assessment, Planner, Progress Review and Plan Review save here automatically.</p> : (
            <ul className="mt-4 space-y-2">{results.data.map((r) => (
              <li key={r.id} className="border-b border-line/40 pb-2">
                <div className="flex items-center justify-between gap-3 text-[14px]">
                  <button className="text-left hover:text-primary" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{r.title}<span className={`${mono} ml-2`}>{TOOL_LABEL[r.tool as Tool]}</span></button>
                  <button className="text-[12px] text-muted hover:text-destructive" onClick={() => delResult.mutate(r.id)}>Delete</button>
                </div>
                {openId === r.id && <div className="prose prose-sm mt-3 max-w-none text-foreground">{opened.data?.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{opened.data.content}</ReactMarkdown> : "Loading…"}</div>}
              </li>))}</ul>)}
        </section>
      </div>
    </main>
  );
}
