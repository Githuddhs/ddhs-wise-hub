import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(100),
  work_email: z.string().trim().email("Enter a valid work email").max(255),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, "Use digits only").optional().or(z.literal("")),
  company: z.string().trim().min(2, "Please enter your company").max(150),
  job_title: z.string().trim().max(100).optional().or(z.literal("")),
  company_size: z.string().min(1, "Select a company size"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  popia_consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});

const SIZES = ["1–49", "50–149", "150–499", "500–1,999", "2,000+"];
const field = "w-full rounded-lg border border-line/70 bg-glass/70 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/40";
const label = "mb-1.5 block font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted";

export function DemoForm() {
  const empty = { full_name: "", work_email: "", phone: "", company: "", job_title: "", company_size: "", message: "", popia_consent: false };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const set = (k: keyof typeof empty, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) {
      const m: Record<string, string> = {};
      r.error.issues.forEach((i) => (m[String(i.path[0])] ??= i.message));
      return setErrs(m);
    }
    setErrs({}); setState("sending");
    const d = r.data;
    const { error } = await supabase.from("demo_requests").insert({
      ...d, phone: d.phone || null, job_title: d.job_title || null, message: d.message || null,
    });
    setState(error ? "error" : "done");
  }

  if (state === "done")
    return (
      <div role="status" className="rounded-[16px] border border-line/60 bg-panel/50 p-6">
        <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-accent">Request received</div>
        <p className="mt-2 font-[Fraunces] text-[22px]">Thank you, {f.full_name.split(" ")[0]}.</p>
        <p className="mt-2 text-[14px] text-muted">Our compliance team will contact you at {f.work_email} within one business day to schedule your walkthrough.</p>
      </div>
    );

  const err = (k: string) => errs[k] && <p className="mt-1 text-[12px] text-destructive">{errs[k]}</p>;
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-[16px] border border-line/60 bg-panel/50 p-5 sm:grid-cols-2">
      <div><label className={label} htmlFor="d-name">Full name *</label><input id="d-name" className={field} maxLength={100} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} />{err("full_name")}</div>
      <div><label className={label} htmlFor="d-email">Work email *</label><input id="d-email" type="email" className={field} maxLength={255} value={f.work_email} onChange={(e) => set("work_email", e.target.value)} />{err("work_email")}</div>
      <div><label className={label} htmlFor="d-co">Company *</label><input id="d-co" className={field} maxLength={150} value={f.company} onChange={(e) => set("company", e.target.value)} />{err("company")}</div>
      <div><label className={label} htmlFor="d-title">Job title</label><input id="d-title" className={field} maxLength={100} value={f.job_title} onChange={(e) => set("job_title", e.target.value)} /></div>
      <div><label className={label} htmlFor="d-phone">Phone</label><input id="d-phone" className={field} maxLength={30} value={f.phone} onChange={(e) => set("phone", e.target.value)} />{err("phone")}</div>
      <div><label className={label} htmlFor="d-size">Employees *</label>
        <select id="d-size" className={field} value={f.company_size} onChange={(e) => set("company_size", e.target.value)}><option value="">Select…</option>{SIZES.map((s) => <option key={s}>{s}</option>)}</select>{err("company_size")}</div>
      <div className="sm:col-span-2"><label className={label} htmlFor="d-msg">What would you like to see?</label><textarea id="d-msg" rows={3} className={field} maxLength={1000} value={f.message} onChange={(e) => set("message", e.target.value)} /></div>
      <label className="flex items-start gap-2 text-[12px] text-muted sm:col-span-2">
        <input type="checkbox" className="mt-0.5" checked={f.popia_consent} onChange={(e) => set("popia_consent", e.target.checked)} />
        I consent to DDHS processing these details to respond to my request, in line with POPIA. *
      </label>
      {err("popia_consent")}
      {state === "error" && <p className="text-[13px] text-destructive sm:col-span-2">We couldn't send your request. Please try again.</p>}
      <button disabled={state === "sending"} className="rounded-full bg-primary px-7 py-3 text-[14px] font-medium text-primary-foreground disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
        {state === "sending" ? "Sending…" : "Request a demo"}
      </button>
    </form>
  );
}
