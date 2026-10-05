import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// Server functions behind the DDHS staff (admin) role. Staff access lives in
// the user_roles table and is checked with the has_role function on every call.
type Sb = import("@supabase/supabase-js").SupabaseClient<Database>;
type Patch = Database["public"]["Tables"]["client_accounts"]["Update"];

const STAFF_ONLY = "This area is for DDHS staff accounts only.";

async function requireAdmin(supabase: Sb, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error(STAFF_ONLY);
}

export type ClientSummary = {
  user_id: string;
  email: string;
  company: string;
  contact_name: string;
  note: string;
  status: string;
  created_at: string;
  registered: boolean;
  employees: number | null;
  measures: number | null;
  evidence: number | null;
  actions: number | null;
};

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdm } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: prof } = await context.supabase.from("profiles").select("email").eq("id", context.userId).limit(1);
    return { userId: context.userId, isAdmin: isAdm === true, email: prof?.[0]?.email ?? "" };
  });

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const [reg, prof] = await Promise.all([
      context.supabase.from("client_accounts").select("*").limit(300),
      context.supabase.from("profiles").select("id, email, full_name, company, created_at").limit(500),
    ]);
    if (reg.error) throw new Error(reg.error.message);
    if (prof.error) throw new Error(prof.error.message);

    const rows: ClientSummary[] = [];
    const blank = { employees: null, measures: null, evidence: null, actions: null };
    for (const c of reg.data ?? []) {
      rows.push({ ...blank, user_id: c.user_id, email: c.email, company: c.company, contact_name: c.contact_name, note: c.note, status: c.status, created_at: c.created_at, registered: true });
    }
    const known = new Set(rows.map((r) => r.user_id));
    for (const p of prof.data ?? []) {
      if (known.has(p.id)) continue;
      rows.push({ ...blank, user_id: p.id, email: p.email ?? "", company: p.company ?? "", contact_name: p.full_name ?? "", note: "", status: "Self-signed", created_at: p.created_at, registered: false });
    }

    for (const r of rows.slice(0, 60)) {
      const { data } = await context.supabase.rpc("client_stats", { _user_id: r.user_id });
      const s = data?.[0];
      if (s) { r.employees = s.employees; r.measures = s.measures; r.evidence = s.evidence; r.actions = s.actions; }
    }
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  });

export const createClientAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().trim().email("Enter a valid email address.").max(255),
      password: z.string().min(10, "Use a longer password.").max(72),
      full_name: z.string().trim().min(2, "Enter the contact's name.").max(100),
      company: z.string().trim().min(1, "Enter the company name.").max(150),
      job_title: z.string().trim().max(100).optional(),
      note: z.string().trim().max(500).optional(),
      send_email: z.boolean().optional(),
      site_url: z.string().url().max(200),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: made, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      data: { full_name: data.full_name, company: data.company, job_title: data.job_title ?? "" },
    });
    if (error) throw new Error(error.message);
    const userId = made.user?.id;
    if (!userId) throw new Error("The account could not be created.");

    const { error: regErr } = await supabaseAdmin.from("client_accounts").upsert({
      user_id: userId,
      company: data.company,
      contact_name: data.full_name,
      email: data.email,
      note: data.note ?? "",
      status: "Onboarded",
      created_by: context.userId,
    });
    if (regErr) throw new Error(regErr.message);

    let emailed = false;
    if (data.send_email) {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const r = await sendTemplateEmail("client-welcome", data.email, {
        templateData: {
          contact_name: data.full_name,
          company: data.company,
          login_email: data.email,
          password: data.password,
          site_url: data.site_url,
        },
      });
      emailed = r.sent === true;
    }
    return { userId, emailed };
  });

export const addClientToRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), note: z.string().trim().max(500).optional() }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: found, error: fErr } = await context.supabase
      .from("profiles")
      .select("email, full_name, company")
      .eq("id", data.user_id)
      .limit(1);
    if (fErr) throw new Error(fErr.message);
    const p = found?.[0];
    if (!p) throw new Error("That account no longer exists.");
    const { error } = await context.supabase.from("client_accounts").upsert({
      user_id: data.user_id,
      company: p.company ?? "",
      contact_name: p.full_name ?? "",
      email: p.email ?? "",
      note: data.note ?? "",
      status: "Onboarded",
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      note: z.string().trim().max(500).optional(),
      status: z.enum(["Onboarded", "Live", "Paused"]).optional(),
      company: z.string().trim().max(150).optional(),
      contact_name: z.string().trim().max(100).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const patch: Patch = { updated_at: new Date().toISOString() };
    if (data.note !== undefined) patch.note = data.note;
    if (data.status !== undefined) patch.status = data.status;
    if (data.company !== undefined) patch.company = data.company;
    if (data.contact_name !== undefined) patch.contact_name = data.contact_name;
    const { error } = await context.supabase.from("client_accounts").update(patch).eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setClientPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), password: z.string().min(10, "Use a longer password.").max(72) }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const openClientSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: found, error: fErr } = await context.supabase.from("profiles").select("email").eq("id", data.user_id).limit(1);
    if (fErr) throw new Error(fErr.message);
    const email = found?.[0]?.email;
    if (!email) throw new Error("That account has no email address on file.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.properties?.hashed_token) throw new Error("That account could not be opened.");
    return { tokenHash: link.properties.hashed_token };
  });
