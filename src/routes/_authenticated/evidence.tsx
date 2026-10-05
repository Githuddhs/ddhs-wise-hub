import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { card, mono, input, btn, primaryBtn, must, todayIso } from "@/lib/ui";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence & Governance — DDHS Equity Intelligence" },
      { name: "description", content: "Categorised EE evidence with version history, a decision log, evidence links to actions and measures, and an activity trail." },
      { property: "og:title", content: "Evidence & Governance — DDHS Equity Intelligence" },
      { property: "og:description", content: "Audit-ready EE evidence, decisions and activity trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvidencePage,
});

const CATS = [["consultation", "Consultation"], ["minutes", "Committee minutes"], ["policy", "Policies"], ["barriers", "Barriers analysis"], ["submission", "Submissions"], ["training", "Training"], ["analysis", "Workforce analysis"], ["other", "Other"]] as const;
const CAT_LABEL = Object.fromEntries(CATS) as Record<string, string>;
type Target = "measure" | "action" | "decision";

function EvidencePage() {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const onError = (e: Error) => setErr(e.message);
  const items = useQuery({ queryKey: ["evidence"], queryFn: () => must(supabase.from("evidence_items").select("id,title,category,description,body,created_at").order("created_at", { ascending: false })) });
  const versions = useQuery({ queryKey: ["evidence-versions"], queryFn: () => must(supabase.from("evidence_versions").select("*").order("version", { ascending: false })) });
  const links = useQuery({ queryKey: ["evidence-links"], queryFn: () => must(supabase.from("evidence_links").select("*")) });
  const decisions = useQuery({ queryKey: ["decisions"], queryFn: () => must(supabase.from("decisions").select("*").order("decided_on", { ascending: false })) });
  const measures = useQuery({ queryKey: ["all-measures"], queryFn: () => must(supabase.from("plan_measures").select("id,measure,status")) });
  const actions = useQuery({ queryKey: ["cm-actions"], queryFn: () => must(supabase.from("committee_actions").select("*")) });
  const meetings = useQuery({ queryKey: ["cm-meetings"], queryFn: () => must(supabase.from("committee_meetings").select("*").order("meeting_date")) });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => must(supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(40)) });
  const refresh = () => ["evidence", "evidence-versions", "evidence-links", "decisions", "audit"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  async function uploadVersion(itemId: string, f: File) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Please sign in again.");
    const next = Math.max(0, ...(versions.data ?? []).filter((v) => v.item_id === itemId).map((v) => v.version)) + 1;
    const path = `${u.user.id}/${itemId}/v${next}-${f.name.replace(/[^\w.-]+/g, "_").slice(0, 120)}`;
    const { error } = await supabase.storage.from("evidence").upload(path, f);
    if (error) throw new Error(error.message);
    await must(supabase.from("evidence_versions").insert({ item_id: itemId, version: next, path, file_name: f.name.slice(0, 255), size_bytes: f.size }));
  }

  const [ni, setNi] = useState({ title: "", category: "consultation", description: "" });
  const [nf, setNf] = useState<File | null>(null);
  const create = useMutation({
    mutationFn: async () => {
      if (nf && nf.size > 20 * 1024 * 1024) throw new Error("Files must be 20 MB or smaller.");
      const it = await must(supabase.from("evidence_items").insert({ title: ni.title, category: ni.category, description: ni.description || null }).select().single());
      if (nf) await uploadVersion(it.id, nf);
    },
    onSuccess: () => { setNi({ title: "", category: ni.category, description: "" }); setNf(null); refresh(); }, onError,
  });
  const addVersion = useMutation({ mutationFn: ({ id, f }: { id: string; f: File }) => uploadVersion(id, f), onSuccess: refresh, onError });
  const delItem = useMutation({
    mutationFn: async (id: string) => {
      const paths = (versions.data ?? []).filter((v) => v.item_id === id).map((v) => v.path);
      if (paths.length) await supabase.storage.from("evidence").remove(paths);
      await must(supabase.from("evidence_items").delete().eq("id", id));
    }, onSuccess: refresh, onError,
  });
  async function open(path: string) {
    const { data, error } = await supabase.storage.from("evidence").createSignedUrl(path, 60);
    if (error || !data) return setErr(error?.message ?? "Could not open file.");
    window.open(data.signedUrl, "_blank", "noopener");
  }
  const link = useMutation({ mutationFn: (v: { item_id: string; target_type: Target; target_id: string }) => must(supabase.from("evidence_links").insert(v)), onSuccess: refresh, onError });
  const unlink = useMutation({ mutationFn: (id: string) => must(supabase.from("evidence_links").delete().eq("id", id)), onSuccess: refresh, onError });

  const [nd, setNd] = useState({ decided_on: todayIso(), decision: "", made_by: "", meeting_id: "" });
  const addDecision = useMutation({ mutationFn: () => must(supabase.from("decisions").insert({ ...nd, made_by: nd.made_by || null, meeting_id: nd.meeting_id || null })), onSuccess: () => { setNd({ ...nd, decision: "", made_by: "" }); refresh(); }, onError });
  const delDecision = useMutation({ mutationFn: (id: string) => must(supabase.from("decisions").delete().eq("id", id)), onSuccess: refresh, onError });

  const [cat, setCat] = useState("");
  const [openBody, setOpenBody] = useState<string | null>(null);
  const targets: { type: Target; id: string; label: string }[] = [
    ...(measures.data ?? []).map((m) => ({ type: "measure" as const, id: m.id, label: `Measure: ${m.measure}` })),
    ...(actions.data ?? []).map((a) => ({ type: "action" as const, id: a.id, label: `Action: ${a.title}` })),
    ...(decisions.data ?? []).map((d) => ({ type: "decision" as const, id: d.id, label: `Decision: ${d.decision.slice(0, 60)}` })),
  ];
  const linked = new Set((links.data ?? []).map((l) => `${l.target_type}:${l.target_id}`));
  const uncovered = targets.filter((t) => !linked.has(`${t.type}:${t.id}`));
  const coverage = targets.length ? Math.round(((targets.length - uncovered.length) / targets.length) * 100) : 0;
  const shown = (items.data ?? []).filter((i) => !cat || i.category === cat);
  const tLabel = (type: string, id: string) => targets.find((t) => t.type === type && t.id === id)?.label ?? "Removed item";

  return (
    <main className="min-h-screen bg-background px-6 py-10 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <AppNav />
        <h1 className="font-[Fraunces] text-[40px] leading-tight">Evidence & governance</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">Keep consultation records, minutes, policies and submissions with full version history, log committee decisions, and link evidence to every action and measure so you're ready for a DEL inspection.</p>
        {err && <p role="alert" className="mt-4 text-[13px] text-destructive">{err}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className={`${card} lg:col-span-2`} aria-label="Add evidence">
            <p className={mono}>Add evidence</p>
            <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (ni.title) create.mutate(); }}>
              <input className={input} placeholder="Title" required maxLength={200} value={ni.title} onChange={(e) => setNi({ ...ni, title: e.target.value })} />
              <select className={input} value={ni.category} onChange={(e) => setNi({ ...ni, category: e.target.value })}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input className={`${input} sm:col-span-2`} placeholder="Description (optional)" maxLength={2000} value={ni.description} onChange={(e) => setNi({ ...ni, description: e.target.value })} />
              <input type="file" aria-label="File" className="text-[13px]" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt" onChange={(e) => setNf(e.target.files?.[0] ?? null)} />
              <button className={primaryBtn} disabled={create.isPending}>{create.isPending ? "Uploading…" : "Save evidence"}</button>
            </form>
          </section>
          <section className={card} aria-label="Evidence coverage">
            <p className={mono}>Evidence coverage</p>
            <p className={`mt-2 font-[Fraunces] text-[44px] ${coverage >= 80 ? "text-accent" : "text-primary"}`}>{targets.length ? `${coverage}%` : "—"}</p>
            <p className="text-[13px] text-muted">{targets.length - uncovered.length} of {targets.length} measures, actions and decisions have evidence.</p>
            {!!uncovered.length && <ul className="mt-3 max-h-40 space-y-1 overflow-auto text-[12px] text-muted">{uncovered.slice(0, 20).map((t) => <li key={t.type + t.id}>○ {t.label}</li>)}</ul>}
          </section>
        </div>

        <section className={`${card} mt-6`} aria-label="Repository">
          <div className="flex flex-wrap gap-2">
            <button className={`${btn} ${!cat ? "bg-panel" : ""}`} onClick={() => setCat("")}>All · {items.data?.length ?? 0}</button>
            {CATS.map(([k, l]) => { const n = (items.data ?? []).filter((i) => i.category === k).length; return n ? <button key={k} className={`${btn} ${cat === k ? "bg-panel" : ""}`} onClick={() => setCat(k)}>{l} · {n}</button> : null; })}
          </div>
          {!shown.length ? <p className="mt-4 text-[14px] text-muted">No evidence yet.</p> : (
            <ul className="mt-4 divide-y divide-line/40">{shown.map((it) => {
              const vs = (versions.data ?? []).filter((v) => v.item_id === it.id);
              const ls = (links.data ?? []).filter((l) => l.item_id === it.id);
              return (
                <li key={it.id} className="py-4 text-[14px]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-medium">{it.title} <span className={`${mono} ml-2`}>{CAT_LABEL[it.category]}</span></p>{it.description && <p className="text-[13px] text-muted">{it.description}</p>}<p className="text-[12px] text-muted">Added {new Date(it.created_at).toLocaleDateString("en-ZA")}</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`${btn} cursor-pointer`}>{vs.length ? "Upload new version" : "Attach file"}<input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addVersion.mutate({ id: it.id, f }); e.target.value = ""; }} /></label>
                      {it.body && <button className={btn} onClick={() => setOpenBody(openBody === it.id ? null : it.id)}>{openBody === it.id ? "Hide" : "Read"}</button>}
                      <button className="text-[12px] text-muted hover:text-destructive" onClick={() => { if (confirm("Delete this evidence and all its versions?")) delItem.mutate(it.id); }}>Delete</button>
                    </div>
                  </div>
                  {!!vs.length && <ul className="mt-2 space-y-1 text-[13px]">{vs.map((v, i) => <li key={v.id}><button className="text-primary hover:underline" onClick={() => void open(v.path)}>v{v.version} · {v.file_name}</button><span className="text-muted"> · {new Date(v.created_at).toLocaleString("en-ZA")}{i === 0 ? " · current" : ""}</span></li>)}</ul>}
                  {openBody === it.id && it.body && <div className="prose prose-sm mt-3 max-w-none text-foreground"><ReactMarkdown remarkPlugins={[remarkGfm]}>{it.body}</ReactMarkdown></div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                    {ls.map((l) => <span key={l.id} className="rounded-full border border-line/60 px-2 py-0.5">{tLabel(l.target_type, l.target_id)} <button aria-label="Unlink" className="ml-1 text-muted hover:text-destructive" onClick={() => unlink.mutate(l.id)}>×</button></span>)}
                    <select aria-label="Link to" className="rounded-lg border border-line/70 bg-panel/60 px-2 py-1 text-[12px]" value="" onChange={(e) => { const [type, id] = e.target.value.split(":"); if (type && id) link.mutate({ item_id: it.id, target_type: type as Target, target_id: id }); }}>
                      <option value="">+ Link to…</option>
                      {targets.filter((t) => !ls.some((l) => l.target_type === t.type && l.target_id === t.id)).map((t) => <option key={t.type + t.id} value={`${t.type}:${t.id}`}>{t.label.slice(0, 80)}</option>)}
                    </select>
                  </div>
                </li>);
            })}</ul>)}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className={card} aria-label="Decision log">
            <p className={mono}>Decision log · {decisions.data?.length ?? 0}</p>
            <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (nd.decision) addDecision.mutate(); }}>
              <input type="date" className={input} value={nd.decided_on} onChange={(e) => setNd({ ...nd, decided_on: e.target.value })} />
              <input className={input} placeholder="Made by" maxLength={150} value={nd.made_by} onChange={(e) => setNd({ ...nd, made_by: e.target.value })} />
              <input className={`${input} sm:col-span-2`} placeholder="Decision" required maxLength={2000} value={nd.decision} onChange={(e) => setNd({ ...nd, decision: e.target.value })} />
              <select className={input} value={nd.meeting_id} onChange={(e) => setNd({ ...nd, meeting_id: e.target.value })}><option value="">No linked meeting</option>{(meetings.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.meeting_date} · {m.title}</option>)}</select>
              <button className={btn}>Log decision</button>
            </form>
            <ul className="mt-4 divide-y divide-line/40 text-[14px]">{(decisions.data ?? []).map((d) => (
              <li key={d.id} className="flex justify-between gap-3 py-2"><span><span className={`${mono} mr-2`}>{d.decided_on}</span>{d.decision}<span className="block text-[12px] text-muted">{d.made_by ?? "—"}{d.meeting_id ? ` · ${meetings.data?.find((m) => m.id === d.meeting_id)?.title ?? "meeting"}` : ""}</span></span><button className="text-[12px] text-muted hover:text-destructive" onClick={() => delDecision.mutate(d.id)}>Delete</button></li>))}</ul>
          </section>
          <section className={card} aria-label="Activity trail">
            <p className={mono}>Activity trail</p>
            <ul className="mt-3 max-h-[480px] space-y-1.5 overflow-auto text-[13px]">{(audit.data ?? []).map((a) => (
              <li key={a.id} className="border-b border-line/30 pb-1.5"><span className="text-muted">{new Date(a.at).toLocaleString("en-ZA")}</span> · {a.action === "INSERT" ? "Added" : a.action === "UPDATE" ? "Updated" : "Removed"} {a.table_name.replace(/_/g, " ").replace(/s$/, "")}{a.summary ? `: ${a.summary}` : ""}</li>))}
              {!audit.data?.length && <li className="text-muted">Changes to plans, evidence, decisions and actions are recorded here.</li>}</ul>
          </section>
        </div>
      </div>
    </main>
  );
}
