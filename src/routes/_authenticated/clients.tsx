import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useIsStaff } from "@/hooks/use-is-staff";
import { btn, card, input, mono, primaryBtn } from "@/lib/ui";
import {
  addClientToRegister,
  createClientAccount,
  listClients,
  setClientPassword,
  updateClient,
  type ClientSummary,
} from "@/lib/admin.functions";
import { openAs } from "@/lib/impersonate";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Client accounts — DDHS" },
      { name: "description", content: "DDHS staff register: create a client login, hand over the access details and open a client's workspace." },
      { property: "og:title", content: "Client accounts — DDHS" },
      { property: "og:description", content: "Create a client login, hand over the access details and open a client's workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clients,
});

const STATUSES = ["Onboarded", "Live", "Paused"] as const;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function makePassword() {
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

type Draft = { full_name: string; company: string; email: string; job_title: string; note: string; password: string; send_email: boolean };
const emptyDraft = (): Draft => ({ full_name: "", company: "", email: "", job_title: "", note: "", password: makePassword(), send_email: true });

type Handover = { email: string; password: string; company: string; emailed: boolean };

function Clients() {
  const qc = useQueryClient();
  const { isStaff, userId, email: staffEmail, checked } = useIsStaff();
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [made, setMade] = useState<Handover | null>(null);
  const [copied, setCopied] = useState("");
  const onError = (e: Error) => { setErr(e.message); setBusyId(""); };

  const rows = useQuery({ queryKey: ["clients"], queryFn: () => listClients(), enabled: isStaff });

  const add = useMutation({
    mutationFn: (v: Draft) =>
      createClientAccount({
        data: {
          email: v.email.trim(),
          password: v.password,
          full_name: v.full_name.trim(),
          company: v.company.trim(),
          job_title: v.job_title.trim() || undefined,
          note: v.note.trim() || undefined,
          send_email: v.send_email,
          site_url: window.location.origin,
        },
      }),
    onSuccess: (r) => {
      setMade({ email: draft.email.trim(), password: draft.password, company: draft.company.trim(), emailed: r.emailed });
      setDraft(emptyDraft());
      setErr("");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError,
  });

  const saveNote = useMutation({
    mutationFn: (v: { user_id: string; note: string }) => updateClient({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    onError,
  });
  const saveStatus = useMutation({
    mutationFn: (v: { user_id: string; status: (typeof STATUSES)[number] }) => updateClient({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    onError,
  });
  const adopt = useMutation({
    mutationFn: (v: { user_id: string }) => addClientToRegister({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    onError,
  });

  function copy(text: string, tag: string) {
    void navigator.clipboard.writeText(text).then(() => { setCopied(tag); setTimeout(() => setCopied(""), 2000); });
  }

  async function open(r: ClientSummary) {
    setErr(""); setBusyId(r.user_id);
    try {
      await openAs({ userId: r.user_id, adminId: userId, adminLabel: staffEmail || "your account", clientLabel: r.company || r.email || "this account" });
    } catch (e) { onError(e as Error); }
  }

  async function reset(r: ClientSummary) {
    const pw = makePassword();
    setErr(""); setBusyId(r.user_id);
    try {
      await setClientPassword({ data: { user_id: r.user_id, password: pw } });
      setMade({ email: r.email, password: pw, company: r.company, emailed: false });
      setBusyId("");
    } catch (e) { onError(e as Error); }
  }

  const [sort, setSort] = useState<"az" | "newest">("az");
  const list = rows.data ?? [];
  const sorted = [...list].sort((a, b) =>
    sort === "az"
      ? (a.company || a.email || "").localeCompare(b.company || b.email || "", "en", { sensitivity: "base" })
      : b.created_at.localeCompare(a.created_at),
  );
  const registered = sorted.filter((r) => r.registered);
  const others = list.filter((r) => !r.registered);

  return (
    <main className="min-h-screen bg-background px-6 py-12 font-[Inter] text-foreground">
      <div className="mx-auto max-w-[1200px]">
        <AppNav />
        <h1 className="font-[Fraunces] text-[40px] leading-tight">Client accounts</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Create a login for a client, hand the details over, and open their workspace when they need help. Nothing here is visible to clients.
        </p>
        {err && <p role="alert" className="mt-4 text-[13px] text-destructive">{err}</p>}

        {!checked && <p className="mt-8 text-[14px] text-muted">Checking your access…</p>}

        {checked && !isStaff && (
          <section className={`${card} mt-8`}>
            <p className={mono}>Staff accounts only</p>
            <p className="mt-2 text-[15px]">This page is for DDHS staff accounts. Sign in with the account DDHS gave you, or ask DDHS to set up access for your company.</p>
            <Link to="/dashboard" className={`${btn} mt-4 inline-block`}>Back to your dashboard</Link>
          </section>
        )}

        {isStaff && made && (
          <section className={`${card} mt-8 border-primary/50`} aria-label="Login details">
            <p className={mono}>Login ready for {made.company || made.email}</p>
            <p className="mt-2 text-[14px]">
              {made.emailed
                ? "The sign-in details were emailed to the client. Keep a copy below in case it lands in their junk mail."
                : "The account exists, but the email could not be sent. Send these details to the client yourself."}
            </p>
            <div className="mt-4 space-y-2 text-[14px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-[JetBrains_Mono]">{made.email}</span>
                <button className={`${btn} text-[12px]`} onClick={() => copy(made.email, "email")}>{copied === "email" ? "Copied" : "Copy email"}</button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-[JetBrains_Mono]">{made.password}</span>
                <button className={`${btn} text-[12px]`} onClick={() => copy(`${made.email} / ${made.password}`, "both")}>{copied === "both" ? "Copied" : "Copy email + password"}</button>
              </div>
              <p className="text-[13px] text-muted">Sign-in page: {typeof window !== "undefined" ? window.location.origin : ""}/auth</p>
            </div>
            <button className={btn} onClick={() => setMade(null)}>Close</button>
          </section>
        )}

        {isStaff && (
          <section className={`${card} mt-6`} aria-label="Add a client">
            <p className={mono}>Add a client</p>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); add.mutate(draft); }}
            >
              <label className="block"><span className={mono}>Contact name</span>
                <input required maxLength={100} className={input} value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} /></label>
              <label className="block"><span className={mono}>Company</span>
                <input required maxLength={150} className={input} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></label>
              <label className="block"><span className={mono}>Their work email (the login)</span>
                <input type="email" required maxLength={255} className={input} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
              <label className="block"><span className={mono}>Job title (optional)</span>
                <input maxLength={100} className={input} value={draft.job_title} onChange={(e) => setDraft({ ...draft, job_title: e.target.value })} /></label>
              <label className="block sm:col-span-2"><span className={mono}>Note for your records (optional)</span>
                <input maxLength={500} className={input} placeholder="e.g. Onboarding pack sent, sector: Manufacturing" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
              <label className="block sm:col-span-2"><span className={mono}>Password</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="flex-1 rounded-lg border border-line/70 bg-panel/60 px-3 py-2 font-[JetBrains_Mono] text-[14px]">{draft.password}</span>
                  <button type="button" className={btn} onClick={() => setDraft({ ...draft, password: makePassword() })}>New password</button>
                </div></label>
              <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
                <input type="checkbox" className="h-4 w-4" checked={draft.send_email} onChange={(e) => setDraft({ ...draft, send_email: e.target.checked })} />
                Email the sign-in details to the client
              </label>
              <div className="sm:col-span-2">
                <button disabled={add.isPending} className={primaryBtn}>{add.isPending ? "Creating…" : "Create client login"}</button>
              </div>
            </form>
          </section>
        )}

        {isStaff && (
          <section className={`${card} mt-6`} aria-label="Client register">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={mono}>Client register</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[13px] text-muted">
                  <span className={mono}>Sort</span>
                  <select
                    className={`${input} w-auto`}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "az" | "newest")}
                    aria-label="Sort clients"
                  >
                    <option value="az">Company A–Z</option>
                    <option value="newest">Newest first</option>
                  </select>
                </label>
                <p className="text-[13px] text-muted">{registered.length} client{registered.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            {!rows.data?.length ? (
              <p className="mt-3 text-[14px] text-muted">No clients yet. Use the form above to create the first login.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[900px] text-[14px]">
                  <thead>
                    <tr className="text-left">{["Client", "Contact", "Status", "Staff", "Measures", "Evidence", "Actions", "Note", ""].map((h) => (
                      <th key={h} className={`${mono} py-2 pr-4`}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.user_id} className="border-t border-line/50 align-top">
                        <td className="py-3 pr-4">
                          <span className="block font-medium">{r.company || "—"}</span>
                          <span className={`${mono} mt-1 block`}>added {r.created_at.slice(0, 10)}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="block">{r.contact_name || "—"}</span>
                          <span className="block text-[13px] text-muted">{r.email || "no email"}</span>
                        </td>
                        <td className="py-3 pr-4">
                          {r.registered ? (
                            <select
                              className={`${input} w-auto`}
                              value={STATUSES.includes(r.status as (typeof STATUSES)[number]) ? r.status : "Onboarded"}
                              onChange={(e) => saveStatus.mutate({ user_id: r.user_id, status: e.target.value as (typeof STATUSES)[number] })}
                            >{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                          ) : (
                            <span className={mono}>{r.status}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">{r.employees ?? "—"}</td>
                        <td className="py-3 pr-4">{r.measures ?? "—"}</td>
                        <td className="py-3 pr-4">{r.evidence ?? "—"}</td>
                        <td className="py-3 pr-4">{r.actions ?? "—"}</td>
                        <td className="py-3 pr-4">
                          {r.registered ? (
                            <input
                              className={`${input} min-w-[160px]`}
                              defaultValue={r.note}
                              maxLength={500}
                              placeholder="Note"
                              onBlur={(e) => { if (e.target.value !== r.note) saveNote.mutate({ user_id: r.user_id, note: e.target.value }); }}
                            />
                          ) : (
                            <button className={`${btn} text-[12px]`} disabled={adopt.isPending} onClick={() => adopt.mutate({ user_id: r.user_id })}>Add to register</button>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="flex flex-wrap gap-2">
                            <button className={`${btn} text-[12px]`} disabled={busyId === r.user_id} onClick={() => open(r)}>
                              {busyId === r.user_id ? "Opening…" : "Open account"}
                            </button>
                            <button className={`${btn} text-[12px]`} disabled={busyId === r.user_id} onClick={() => reset(r)}>New password</button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {others.length > 0 && (
              <p className="mt-3 text-[13px] text-muted">
                {others.length} account{others.length === 1 ? "" : "s"} signed up on their own and are not in the register yet — use <span className="font-medium">Add to register</span> to track them.
              </p>
            )}
            <p className="mt-4 text-[13px] text-muted">
              <span className="font-medium">Open account</span> switches this browser into that client's workspace. A bar at the top of every page reminds you whose account you are in, and <span className="font-medium">Back to my account</span> returns you.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
