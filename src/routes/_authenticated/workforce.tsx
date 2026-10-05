import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { card, mono, input, btn, primaryBtn, must, download } from "@/lib/ui";
import { ALL_LEVELS, LEVEL_LABEL, FIELDS, guessMapping, mapRows, validate, employeeTemplateCsv, type Employee, type FieldKey } from "@/lib/eea12";

export const Route = createFileRoute("/_authenticated/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce Data — DDHS Equity Intelligence" },
      { name: "description", content: "Import and maintain your employee master record for Employment Equity, with automatic completeness and consistency checks." },
      { property: "og:title", content: "Workforce Data — DDHS Equity Intelligence" },
      { property: "og:description", content: "Excel/CSV employee import, validation and data-quality score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkforcePage,
});

type Row = Employee & { id: string };
const blank: Employee = { employee_no: "", level: null, race: null, gender: null, disability: false, foreign_national: false, department: null, start_date: null, end_date: null, promoted_on: null };
const RACE = { A: "African", C: "Coloured", I: "Indian", W: "White" } as Record<string, string>;

function WorkforcePage() {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const emps = useQuery({ queryKey: ["employees"], queryFn: () => must(supabase.from("employees").select("*").order("employee_no").limit(10000)) as Promise<Row[]> });
  const batches = useQuery({ queryKey: ["import-batches"], queryFn: () => must(supabase.from("import_batches").select("*").order("created_at", { ascending: false }).limit(5)) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["employees"] }); qc.invalidateQueries({ queryKey: ["import-batches"] }); };

  // Import wizard state
  const [file, setFile] = useState<{ name: string; headers: string[]; rows: unknown[][] } | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, number>>>({});
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const preview = useMemo(() => (file ? mapRows(file.rows, mapping) : []), [file, mapping]);
  const previewCheck = useMemo(() => validate(preview), [preview]);

  async function onFile(f: File) {
    setErr(""); setMsg("");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0] ?? ""];
      if (!ws) throw new Error("The file has no sheets.");
      const all = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
      const headers = (all[0] ?? []).map((h) => String(h));
      const rows = all.slice(1).filter((r) => r.some((c) => String(c).trim()));
      if (!rows.length) throw new Error("No employee rows found below the header row.");
      setFile({ name: f.name, headers, rows });
      setMapping(guessMapping(headers));
    } catch (e) { setErr((e as Error).message); }
  }

  const doImport = useMutation({
    mutationFn: async () => {
      if (!file) return;
      if (mapping.employee_no === undefined) throw new Error("Choose which column holds the employee number.");
      const dedup = [...new Map(preview.map((e) => [e.employee_no, e])).values()];
      if (mode === "replace") await must(supabase.from("employees").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      for (let i = 0; i < dedup.length; i += 500) {
        await must(supabase.from("employees").upsert(dedup.slice(i, i + 500).map((e) => ({ ...e, updated_at: new Date().toISOString() })), { onConflict: "user_id,employee_no" }));
      }
      await must(supabase.from("import_batches").insert({ file_name: file.name.slice(0, 255), mode, row_count: dedup.length }));
      return dedup.length;
    },
    onSuccess: (n) => { setMsg(`Imported ${n} employees.`); setFile(null); refresh(); },
    onError: (e: Error) => setErr(e.message),
  });

  // Table state
  const [q, setQ] = useState("");
  const [lvl, setLvl] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [edit, setEdit] = useState<Employee | null>(null);
  const list = emps.data ?? [];
  const check = useMemo(() => validate(list), [list]);
  const issueNos = useMemo(() => new Set(check.issues.map((i) => i.employee_no)), [check]);
  const shown = list.filter((e) => (!q || `${e.employee_no} ${e.department ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!lvl || e.level === lvl) && (!onlyIssues || issueNos.has(e.employee_no)));

  const save = useMutation({
    mutationFn: async (e: Employee) => {
      if (!e.employee_no.trim()) throw new Error("Employee number is required.");
      const { id, ...rest } = e as Row;
      const row = { ...rest, updated_at: new Date().toISOString() };
      return id ? must(supabase.from("employees").update(row).eq("id", id)) : must(supabase.from("employees").insert(row));
    },
    onSuccess: () => { setEdit(null); refresh(); }, onError: (e: Error) => setErr(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => must(supabase.from("employees").delete().eq("id", id)), onSuccess: refresh, onError: (e: Error) => setErr(e.message) });

  const errors = check.issues.filter((i) => i.severity === "error");
  const byField = errors.reduce<Record<string, number>>((m, i) => ({ ...m, [i.message.split(" \"")[0]!]: (m[i.message.split(" \"")[0]!] ?? 0) + 1 }), {});

  return (
    <main className="min-h-screen bg-background px-6 py-10 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <AppNav />
        <h1 className="font-[Fraunces] text-[40px] leading-tight">Workforce data</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">Your employee master record. Only an employee number and EE fields are kept — no names or ID numbers (POPIA). It feeds the <Link to="/analysis" className="text-primary hover:underline">EEA12 analysis</Link>, the plan and the dashboard.</p>
        {err && <p role="alert" className="mt-4 text-[13px] text-destructive">{err}</p>}
        {msg && <p role="status" className="mt-4 text-[13px] text-accent">{msg}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className={`${card} lg:col-span-2`} aria-label="Import">
            <p className={mono}>Import Excel / CSV</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className={`${primaryBtn} cursor-pointer`}>Choose file<input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} /></label>
              <button className={btn} onClick={() => download("employee-template.csv", new Blob([employeeTemplateCsv()], { type: "text/csv" }))}>Download template</button>
            </div>
            {file && (
              <div className="mt-6">
                <p className="text-[14px]">{file.name} · {file.rows.length} rows. Match your columns:</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {FIELDS.map(([key, label]) => (
                    <label key={key} className="text-[13px]"><span className={mono}>{label}{key === "employee_no" ? " *" : ""}</span>
                      <select className={`${input} mt-1`} value={mapping[key] ?? ""} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value === "" ? undefined : Number(e.target.value) })}>
                        <option value="">— not in file —</option>
                        {file.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <p className={`${mono} mt-6`}>Preview (first 5)</p>
                <div className="mt-2 overflow-x-auto"><EmpTable rows={preview.slice(0, 5)} /></div>
                <p className="mt-3 text-[13px]">{preview.length} employees read · data quality {previewCheck.score}% · {previewCheck.issues.filter((i) => i.severity === "error").length} issues to fix later</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="text-[13px]"><input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} /> Merge (update by employee no.)</label>
                  <label className="text-[13px]"><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace all existing</label>
                  <button className={primaryBtn} disabled={doImport.isPending || !preview.length} onClick={() => doImport.mutate()}>{doImport.isPending ? "Importing…" : `Import ${preview.length}`}</button>
                  <button className={btn} onClick={() => setFile(null)}>Cancel</button>
                </div>
              </div>
            )}
            {!!batches.data?.length && !file && (
              <ul className="mt-6 space-y-1 text-[12px] text-muted">{batches.data.map((b) => <li key={b.id}>{new Date(b.created_at).toLocaleString("en-ZA")} · {b.file_name} · {b.row_count} rows · {b.mode}</li>)}</ul>
            )}
          </section>

          <section className={card} aria-label="Data quality">
            <p className={mono}>Data quality</p>
            <p className={`mt-2 font-[Fraunces] text-[44px] ${check.score >= 95 ? "text-accent" : check.score >= 80 ? "text-primary" : "text-destructive"}`}>{list.length ? `${check.score}%` : "—"}</p>
            <p className="text-[13px] text-muted">{list.length} employees · {list.length - new Set(errors.map((i) => i.employee_no)).size} complete and consistent</p>
            <ul className="mt-4 space-y-1 text-[13px]">
              {Object.entries(byField).map(([m, n]) => <li key={m} className="flex justify-between"><span>{m}</span><span className="text-destructive">{n}</span></li>)}
              {list.length > 0 && !errors.length && <li className="text-accent">No issues found.</li>}
            </ul>
            {check.issues.some((i) => i.severity === "warning") && <p className="mt-2 text-[12px] text-muted">{check.issues.filter((i) => i.severity === "warning").length} warnings (future dates, promotion before start).</p>}
          </section>
        </div>

        <section className={`${card} mt-6`} aria-label="Employees">
          <div className="flex flex-wrap items-center gap-2">
            <input className="rounded-lg border border-line/70 bg-panel/60 px-2 py-1.5 text-[13px] w-56" placeholder="Search employee no. or dept" value={q} onChange={(e) => setQ(e.target.value)} />
            <select aria-label="Filter level" className="rounded-lg border border-line/70 bg-panel/60 px-2 py-1.5 text-[13px]" value={lvl} onChange={(e) => setLvl(e.target.value)}>
              <option value="">All levels</option>{ALL_LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <label className="text-[13px]"><input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Only rows with issues</label>
            <button className={`${btn} ml-auto`} onClick={() => setEdit({ ...blank })}>Add employee</button>
          </div>
          {edit && <EditForm value={edit} onChange={setEdit} onSave={() => save.mutate(edit)} onCancel={() => setEdit(null)} saving={save.isPending} />}
          <div className="mt-4 max-h-[560px] overflow-auto">
            {emps.isLoading ? <p className="text-[14px] text-muted">Loading…</p> : !list.length ? <p className="text-[14px] text-muted">No employees yet. Import a file or add one.</p> : (
              <EmpTable rows={shown.slice(0, 500)} issues={issueNos} onEdit={(e) => setEdit(e)} onDelete={(id) => { if (confirm("Delete this employee record?")) del.mutate(id); }} />
            )}
          </div>
          {shown.length > 500 && <p className="mt-2 text-[12px] text-muted">Showing 500 of {shown.length}. Use search to narrow.</p>}
        </section>
      </div>
    </main>
  );
}

function EmpTable({ rows, issues, onEdit, onDelete }: { rows: Employee[]; issues?: Set<string> | undefined; onEdit?: ((e: Employee) => void) | undefined; onDelete?: ((id: string) => void) | undefined }) {
  return (
    <table className="w-full text-[13px]">
      <thead><tr className="text-left">{["No.", "Level", "Race", "Gender", "PWD", "Foreign", "Dept", "Start", "End", "Promoted", ""].map((h) => <th key={h} className={`${mono} py-2 pr-3`}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((e, i) => (
        <tr key={e.id ?? i} className="border-t border-line/40">
          <td className="py-1.5 pr-3">{issues?.has(e.employee_no) && <span className="mr-1 text-destructive" title="Has issues">●</span>}{e.employee_no}</td>
          <td className="pr-3">{e.level ? LEVEL_LABEL[e.level as keyof typeof LEVEL_LABEL] ?? <span className="text-destructive">{e.level}</span> : <span className="text-destructive">—</span>}</td>
          <td className="pr-3">{e.race ? RACE[e.race] ?? e.race : e.foreign_national ? "" : <span className="text-destructive">—</span>}</td>
          <td className="pr-3">{e.gender ?? <span className="text-destructive">—</span>}</td>
          <td className="pr-3">{e.disability ? "Yes" : ""}</td>
          <td className="pr-3">{e.foreign_national ? "Yes" : ""}</td>
          <td className="pr-3">{e.department}</td>
          <td className="pr-3">{e.start_date}</td><td className="pr-3">{e.end_date}</td><td className="pr-3">{e.promoted_on}</td>
          <td className="whitespace-nowrap">{onEdit && <button className="text-primary hover:underline" onClick={() => onEdit(e)}>Edit</button>}{onDelete && e.id && <button className="ml-3 text-muted hover:text-destructive" onClick={() => onDelete(e.id!)}>Delete</button>}</td>
        </tr>))}</tbody>
    </table>
  );
}

function EditForm({ value: v, onChange, onSave, onCancel, saving }: { value: Employee; onChange: (e: Employee) => void; onSave: () => void; onCancel: () => void; saving: boolean }) {
  const set = (k: keyof Employee, val: unknown) => onChange({ ...v, [k]: val === "" ? null : val });
  return (
    <form className="mt-4 grid gap-3 rounded-xl border border-line/60 p-4 sm:grid-cols-3 lg:grid-cols-5" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <label className="text-[12px]"><span className={mono}>Employee no.</span><input className={`${input} mt-1`} required maxLength={40} value={v.employee_no} onChange={(e) => onChange({ ...v, employee_no: e.target.value })} /></label>
      <label className="text-[12px]"><span className={mono}>Level</span><select className={`${input} mt-1`} value={v.level ?? ""} onChange={(e) => set("level", e.target.value)}><option value="">—</option>{ALL_LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="text-[12px]"><span className={mono}>Race</span><select className={`${input} mt-1`} value={v.race ?? ""} onChange={(e) => set("race", e.target.value)}><option value="">—</option>{Object.entries(RACE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="text-[12px]"><span className={mono}>Gender</span><select className={`${input} mt-1`} value={v.gender ?? ""} onChange={(e) => set("gender", e.target.value)}><option value="">—</option><option value="M">Male</option><option value="F">Female</option></select></label>
      <label className="text-[12px]"><span className={mono}>Department</span><input className={`${input} mt-1`} maxLength={100} value={v.department ?? ""} onChange={(e) => set("department", e.target.value)} /></label>
      <label className="text-[12px]"><span className={mono}>Start date</span><input type="date" className={`${input} mt-1`} value={v.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} /></label>
      <label className="text-[12px]"><span className={mono}>End date</span><input type="date" className={`${input} mt-1`} value={v.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} /></label>
      <label className="text-[12px]"><span className={mono}>Promotion date</span><input type="date" className={`${input} mt-1`} value={v.promoted_on ?? ""} onChange={(e) => set("promoted_on", e.target.value)} /></label>
      <label className="flex items-end gap-2 text-[13px]"><input type="checkbox" checked={v.disability} onChange={(e) => onChange({ ...v, disability: e.target.checked })} /> Disability</label>
      <label className="flex items-end gap-2 text-[13px]"><input type="checkbox" checked={v.foreign_national} onChange={(e) => onChange({ ...v, foreign_national: e.target.checked })} /> Foreign national</label>
      <div className="flex gap-2 sm:col-span-3 lg:col-span-5"><button className={primaryBtn} disabled={saving}>{saving ? "Saving…" : "Save"}</button><button type="button" className={btn} onClick={onCancel}>Cancel</button></div>
    </form>
  );
}
