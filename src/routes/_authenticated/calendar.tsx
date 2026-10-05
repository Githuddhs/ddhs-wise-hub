import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Compliance Calendar — DDHS Equity Intelligence" },
      { name: "description", content: "Every EE committee action with its deadline, status and automatic email reminders, plus statutory reporting dates." },
      { property: "og:title", content: "Compliance Calendar — DDHS Equity Intelligence" },
      { property: "og:description", content: "Committee action deadlines, statuses and reminders in one calendar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

type Status = "Open" | "In progress" | "Done";
const STATUSES: Status[] = ["Open", "In progress", "Done"];
const card = "rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl";
const mono = "font-[JetBrains_Mono] text-[11px] uppercase tracking-wider text-muted";
const input = "rounded-lg border border-line/70 bg-panel/60 px-2 py-1.5 text-[13px]";

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}
const daysTo = (iso: string) => Math.ceil((new Date(iso + "T00:00:00").getTime() - Date.now()) / 86400000);
function nextJan15() { const d = new Date(); const y = d.getMonth() === 0 && d.getDate() <= 15 ? d.getFullYear() : d.getFullYear() + 1; return `${y}-01-15`; }

function CalendarPage() {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const actions = useQuery({ queryKey: ["cm-actions"], queryFn: () => must(supabase.from("committee_actions").select("*").order("due_date", { nullsFirst: true })) });
  const members = useQuery({ queryKey: ["cm-members"], queryFn: () => must(supabase.from("committee_members").select("id,name")) });
  const update = useMutation({
    mutationFn: (v: { id: string; due_date?: string | null; status?: Status }) => { const { id, ...rest } = v; return must(supabase.from("committee_actions").update(rest).eq("id", id)); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cm-actions"] }), onError: (e: Error) => setErr(e.message),
  });
  const today = new Date().toISOString().slice(0, 10);
  const name = (id: string | null) => members.data?.find((m) => m.id === id)?.name ?? "Unassigned";
  const acts = actions.data ?? [];
  const groups: [string, typeof acts][] = [
    ["No deadline set", acts.filter((a) => !a.due_date && a.status !== "Done")],
    ["Overdue", acts.filter((a) => a.due_date && a.due_date < today && a.status !== "Done")],
    ["Due in the next 30 days", acts.filter((a) => a.due_date && a.due_date >= today && daysTo(a.due_date) <= 30 && a.status !== "Done")],
    ["Later", acts.filter((a) => a.due_date && daysTo(a.due_date) > 30 && a.status !== "Done")],
    ["Done", acts.filter((a) => a.status === "Done")],
  ];
  const eea = nextJan15();

  return (
    <main className="min-h-screen bg-background px-6 py-12 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1100px]">
        <Link to="/dashboard" className="text-[13px] text-muted hover:text-foreground">← Dashboard</Link>
        <h1 className="mt-4 font-[Fraunces] text-[40px] leading-tight">Compliance Calendar</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">Every committee action with its deadline and status. A reminder email goes to sdm@ddhs.co.za each morning for actions that are overdue or due within 3 days. Add actions in the <Link to="/committee" className="text-primary hover:underline">Committee tracker</Link>.</p>
        {err && <p role="alert" className="mt-4 text-[13px] text-destructive">{err}</p>}

        <section className={`${card} mt-8 flex flex-wrap items-center justify-between gap-4`}>
          <div><p className={mono}>Statutory</p><p className="mt-1 text-[15px]">EEA2 & EEA4 report due (s21) · {eea}</p></div>
          <p className="font-[Fraunces] text-[28px]">{daysTo(eea)} days</p>
        </section>

        {groups.map(([label, list]) => list.length > 0 && (
          <section key={label} className={`${card} mt-6`} aria-label={label}>
            <p className={`${mono} ${label === "Overdue" ? "text-destructive" : ""}`}>{label} · {list.length}</p>
            <ul className="mt-4 divide-y divide-line/40">
              {list.map((a) => {
                const d = a.due_date ? daysTo(a.due_date) : null;
                return (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]">
                    <div className="min-w-[200px] flex-1">
                      <p>{a.title}</p>
                      <p className="text-[12px] text-muted">{name(a.member_id)}{a.reminded_on ? ` · reminder sent ${a.reminded_on}` : ""}</p>
                    </div>
                    <span className={`${mono} ${d !== null && d < 0 && a.status !== "Done" ? "text-destructive" : ""}`}>{d === null ? "—" : d < 0 ? `${-d}d late` : `${d}d`}</span>
                    <input type="date" aria-label={`Deadline for ${a.title}`} className={input} value={a.due_date ?? ""} onChange={(e) => update.mutate({ id: a.id, due_date: e.target.value || null })} />
                    <select aria-label={`Status for ${a.title}`} className={input} value={a.status} onChange={(e) => update.mutate({ id: a.id, status: e.target.value as Status })}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </li>);
              })}
            </ul>
          </section>
        ))}
        {actions.isSuccess && !acts.length && <p className="mt-6 text-[14px] text-muted">No committee actions yet. Add some in the Committee tracker.</p>}
      </div>
    </main>
  );
}
