import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/committee")({
  head: () => ({
    meta: [
      { title: "EE Committee Tracker — DDHS Equity Intelligence" },
      { name: "description", content: "Track your Employment Equity committee members, meeting dates and action items with a live progress tracker." },
      { property: "og:title", content: "EE Committee Tracker — DDHS Equity Intelligence" },
      { property: "og:description", content: "Members, meetings and action items for your EE consultation committee in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommitteePage,
});

type Status = "Open" | "In progress" | "Done";
const STATUSES: Status[] = ["Open", "In progress", "Done"];
const input = "w-full rounded-lg border border-line/70 bg-panel/60 px-3 py-2 text-[14px]";
const card = "rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl";
const mono = "font-[JetBrains_Mono] text-[11px] uppercase tracking-wider text-muted";

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

function CommitteePage() {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["cm-members"], queryFn: () => must(supabase.from("committee_members").select("*").order("created_at")) });
  const meetings = useQuery({ queryKey: ["cm-meetings"], queryFn: () => must(supabase.from("committee_meetings").select("*").order("meeting_date")) });
  const actions = useQuery({ queryKey: ["cm-actions"], queryFn: () => must(supabase.from("committee_actions").select("*").order("due_date", { nullsFirst: false })) });
  const refresh = (k: string) => qc.invalidateQueries({ queryKey: [k] });
  const [err, setErr] = useState("");
  const onError = (e: Error) => setErr(e.message);

  const addMember = useMutation({ mutationFn: (v: { name: string; role: string; represents: string; email: string }) => must(supabase.from("committee_members").insert(v)), onSuccess: () => refresh("cm-members"), onError });
  const addMeeting = useMutation({ mutationFn: (v: { meeting_date: string; title: string; notes: string }) => must(supabase.from("committee_meetings").insert(v)), onSuccess: () => refresh("cm-meetings"), onError });
  const addAction = useMutation({ mutationFn: (v: { title: string; due_date: string | null; member_id: string | null; meeting_id: string | null }) => must(supabase.from("committee_actions").insert(v)), onSuccess: () => refresh("cm-actions"), onError });
  const setStatus = useMutation({ mutationFn: (v: { id: string; status: Status }) => must(supabase.from("committee_actions").update({ status: v.status }).eq("id", v.id)), onSuccess: () => refresh("cm-actions"), onError });
  const remove = useMutation({
    mutationFn: (v: { table: "committee_members" | "committee_meetings" | "committee_actions"; id: string }) => must(supabase.from(v.table).delete().eq("id", v.id)),
    onSuccess: () => { refresh("cm-members"); refresh("cm-meetings"); refresh("cm-actions"); }, onError,
  });

  const [m, setM] = useState({ name: "", role: "", represents: "", email: "" });
  const [mt, setMt] = useState({ meeting_date: "", title: "", notes: "" });
  const [a, setA] = useState({ title: "", due_date: "", member_id: "", meeting_id: "" });

  const acts = actions.data ?? [];
  const done = acts.filter((x) => x.status === "Done").length;
  const inProg = acts.filter((x) => x.status === "In progress").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = acts.filter((x) => x.status !== "Done" && x.due_date && x.due_date < today).length;
  const pct = acts.length ? Math.round((done / acts.length) * 100) : 0;
  const nextMeeting = (meetings.data ?? []).find((x) => x.meeting_date >= today);
  const memberName = (id: string | null) => members.data?.find((x) => x.id === id)?.name ?? "Unassigned";
  const meetingName = (id: string | null) => { const x = meetings.data?.find((y) => y.id === id); return x ? `${x.meeting_date} · ${x.title}` : ""; };

  return (
    <main className="min-h-screen bg-background px-6 py-12 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <Link to="/" className="text-[13px] text-muted hover:text-foreground">← DDHS Equity Intelligence</Link>
        <h1 className="mt-4 font-[Fraunces] text-[40px] leading-tight">EE Committee Tracker</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">Keep your consultation committee (s16–17) on record: who sits on it, when it meets and what it has committed to. Saved to your account.</p>
        {err && <p role="alert" className="mt-4 text-[13px] text-destructive">{err}</p>}

        <section className={`${card} mt-8`} aria-label="Progress">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={mono}>Action items complete</p>
              <p className="mt-1 font-[Fraunces] text-[36px]">{pct}%</p>
            </div>
            <dl className="flex gap-8 text-[13px]">
              <div><dt className={mono}>Done</dt><dd className="mt-1 text-[18px]">{done}/{acts.length}</dd></div>
              <div><dt className={mono}>In progress</dt><dd className="mt-1 text-[18px]">{inProg}</dd></div>
              <div><dt className={mono}>Overdue</dt><dd className={`mt-1 text-[18px] ${overdue ? "text-destructive" : ""}`}>{overdue}</dd></div>
              <div><dt className={mono}>Next meeting</dt><dd className="mt-1 text-[18px]">{nextMeeting?.meeting_date ?? "—"}</dd></div>
            </dl>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line/50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className={card}>
            <h2 className="font-[Fraunces] text-[22px]">Members</h2>
            <form className="mt-4 grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); if (!m.name.trim()) return; setErr(""); addMember.mutate(m); setM({ name: "", role: "", represents: "", email: "" }); }}>
              <input aria-label="Name" placeholder="Name" maxLength={100} required value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} className={input} />
              <input aria-label="Role" placeholder="Role (e.g. Chairperson)" maxLength={100} value={m.role} onChange={(e) => setM({ ...m, role: e.target.value })} className={input} />
              <input aria-label="Represents" placeholder="Represents (e.g. Union, Management)" maxLength={100} value={m.represents} onChange={(e) => setM({ ...m, represents: e.target.value })} className={input} />
              <input aria-label="Email" type="email" placeholder="Email" maxLength={255} value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} className={input} />
              <button className="col-span-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground">Add member</button>
            </form>
            <ul className="mt-4 divide-y divide-line/50">
              {(members.data ?? []).map((x) => (
                <li key={x.id} className="flex items-center justify-between py-2.5 text-[14px]">
                  <span><span className="font-medium">{x.name}</span><span className="text-muted">{[x.role, x.represents].filter(Boolean).map((s) => ` · ${s}`).join("")}</span></span>
                  <button onClick={() => remove.mutate({ table: "committee_members", id: x.id })} className="text-[12px] text-muted underline">Remove</button>
                </li>
              ))}
              {members.data?.length === 0 && <li className="py-3 text-[13px] text-muted">No members yet.</li>}
            </ul>
          </section>

          <section className={card}>
            <h2 className="font-[Fraunces] text-[22px]">Meetings</h2>
            <form className="mt-4 grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); if (!mt.meeting_date || !mt.title.trim()) return; setErr(""); addMeeting.mutate(mt); setMt({ meeting_date: "", title: "", notes: "" }); }}>
              <input aria-label="Meeting date" type="date" required value={mt.meeting_date} onChange={(e) => setMt({ ...mt, meeting_date: e.target.value })} className={input} />
              <input aria-label="Meeting title" placeholder="Title (e.g. Q1 consultation)" maxLength={150} required value={mt.title} onChange={(e) => setMt({ ...mt, title: e.target.value })} className={input} />
              <input aria-label="Notes" placeholder="Notes / agenda (optional)" maxLength={2000} value={mt.notes} onChange={(e) => setMt({ ...mt, notes: e.target.value })} className={`${input} col-span-2`} />
              <button className="col-span-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground">Add meeting</button>
            </form>
            <ul className="mt-4 divide-y divide-line/50">
              {(meetings.data ?? []).map((x) => (
                <li key={x.id} className="flex items-start justify-between gap-3 py-2.5 text-[14px]">
                  <span><span className="font-[JetBrains_Mono] text-[12px] text-muted">{x.meeting_date}</span> <span className="font-medium">{x.title}</span>{x.meeting_date < today && <span className="ml-2 text-[11px] text-muted">held</span>}{x.notes && <span className="block text-[13px] text-muted">{x.notes}</span>}</span>
                  <button onClick={() => remove.mutate({ table: "committee_meetings", id: x.id })} className="text-[12px] text-muted underline">Remove</button>
                </li>
              ))}
              {meetings.data?.length === 0 && <li className="py-3 text-[13px] text-muted">No meetings yet.</li>}
            </ul>
          </section>
        </div>

        <section className={`${card} mt-8`}>
          <h2 className="font-[Fraunces] text-[22px]">Action items</h2>
          <form className="mt-4 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (!a.title.trim()) return; setErr(""); addAction.mutate({ title: a.title, due_date: a.due_date || null, member_id: a.member_id || null, meeting_id: a.meeting_id || null }); setA({ title: "", due_date: "", member_id: "", meeting_id: "" }); }}>
            <input aria-label="Action" placeholder="Action (e.g. Finalise barrier analysis)" maxLength={200} required value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} className={input} />
            <input aria-label="Due date" type="date" value={a.due_date} onChange={(e) => setA({ ...a, due_date: e.target.value })} className={input} />
            <select aria-label="Owner" value={a.member_id} onChange={(e) => setA({ ...a, member_id: e.target.value })} className={input}>
              <option value="">Owner…</option>
              {(members.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select aria-label="From meeting" value={a.meeting_id} onChange={(e) => setA({ ...a, meeting_id: e.target.value })} className={input}>
              <option value="">From meeting…</option>
              {(meetings.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.meeting_date} · {x.title}</option>)}
            </select>
            <button className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground">Add</button>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead><tr className={mono}><th className="py-2 pr-3 font-normal">Action</th><th className="pr-3 font-normal">Owner</th><th className="pr-3 font-normal">Due</th><th className="pr-3 font-normal">Meeting</th><th className="pr-3 font-normal">Status</th><th /></tr></thead>
              <tbody className="divide-y divide-line/50">
                {acts.map((x) => {
                  const late = x.status !== "Done" && x.due_date && x.due_date < today;
                  return (
                    <tr key={x.id}>
                      <td className={`py-2.5 pr-3 ${x.status === "Done" ? "text-muted line-through" : ""}`}>{x.title}</td>
                      <td className="pr-3">{memberName(x.member_id)}</td>
                      <td className={`pr-3 font-[JetBrains_Mono] text-[12px] ${late ? "text-destructive" : ""}`}>{x.due_date ?? "—"}{late ? " · overdue" : ""}</td>
                      <td className="pr-3 text-[13px] text-muted">{meetingName(x.meeting_id)}</td>
                      <td className="pr-3">
                        <select aria-label={`Status for ${x.title}`} value={x.status} onChange={(e) => setStatus.mutate({ id: x.id, status: e.target.value as Status })} className="rounded-md border border-line/70 bg-panel/60 px-2 py-1 text-[13px]">
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td><button onClick={() => remove.mutate({ table: "committee_actions", id: x.id })} className="text-[12px] text-muted underline">Remove</button></td>
                    </tr>
                  );
                })}
                {acts.length === 0 && <tr><td colSpan={6} className="py-3 text-[13px] text-muted">No action items yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
