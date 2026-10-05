import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// Invoicing for DDHS staff: raise a tax invoice, the client settles it by EFT,
// staff mark it paid. Clients never see any of these tables.
type Sb = import("@supabase/supabase-js").SupabaseClient<Database>;
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

const STAFF_ONLY = "This area is for DDHS staff accounts only.";
const VAT_RATE = 15; // South African standard rate, percent
const PREFIX = "DDHS"; // invoice numbers read DDHS-2026-0001

async function requireAdmin(supabase: Sb, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error(STAFF_ONLY);
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type BillingSettings = {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  vat_number: string;
  vat_mode: "exclusive" | "inclusive" | "none";
  payfast_link: string;
  due_days: number;
};

export type Invoice = {
  id: string;
  number: string;
  user_id: string;
  issue_date: string;
  due_date: string;
  period_label: string;
  description: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: "Draft" | "Sent" | "Paid" | "Void";
  paid_on: string | null;
  paid_method: string;
  note: string;
  emailed_at: string | null;
  created_at: string;
  company: string;
  contact_name: string;
  billing_email: string;
};

const blankSettings: BillingSettings = {
  bank_name: "",
  account_name: "",
  account_number: "",
  branch_code: "",
  vat_number: "",
  vat_mode: "exclusive",
  payfast_link: "",
  due_days: 14,
};

export const getBillingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("billing_settings").select("*").eq("id", 1).limit(1);
    if (error) throw new Error(error.message);
    const s = data?.[0];
    if (!s) return blankSettings;
    return {
      bank_name: s.bank_name,
      account_name: s.account_name,
      account_number: s.account_number,
      branch_code: s.branch_code,
      vat_number: s.vat_number,
      vat_mode: s.vat_mode as BillingSettings["vat_mode"],
      payfast_link: s.payfast_link,
      due_days: s.due_days,
    };
  });

export const saveBillingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      bank_name: z.string().trim().max(120),
      account_name: z.string().trim().max(120),
      account_number: z.string().trim().max(32),
      branch_code: z.string().trim().max(16),
      vat_number: z.string().trim().max(24),
      vat_mode: z.enum(["exclusive", "inclusive", "none"]),
      payfast_link: z.string().trim().max(300),
      due_days: z.number().int().min(0).max(90),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("billing_settings").upsert({
      id: 1,
      ...data,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const [inv, reg] = await Promise.all([
      context.supabase.from("invoices").select("*").order("issue_date", { ascending: false }).order("created_at", { ascending: false }).limit(500),
      context.supabase.from("client_accounts").select("user_id, company, contact_name, billing_email, email"),
    ]);
    if (inv.error) throw new Error(inv.error.message);
    if (reg.error) throw new Error(reg.error.message);
    const byUser = new Map((reg.data ?? []).map((c) => [c.user_id, c]));
    return (inv.data ?? []).map((r): Invoice => {
      const c = byUser.get(r.user_id);
      return {
        id: r.id,
        number: r.number,
        user_id: r.user_id,
        issue_date: r.issue_date,
        due_date: r.due_date,
        period_label: r.period_label,
        description: r.description,
        amount: Number(r.amount),
        vat_rate: Number(r.vat_rate),
        vat_amount: Number(r.vat_amount),
        total: Number(r.total),
        status: r.status as Invoice["status"],
        paid_on: r.paid_on,
        paid_method: r.paid_method,
        note: r.note,
        emailed_at: r.emailed_at,
        created_at: r.created_at,
        company: c?.company ?? "",
        contact_name: c?.contact_name ?? "",
        billing_email: c?.billing_email || c?.email || "",
      };
    });
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      description: z.string().trim().min(1, "Enter what you are charging for.").max(300),
      period_label: z.string().trim().max(60).optional(),
      amount: z.coerce.number().positive("Enter an amount greater than zero.").max(10000000),
      issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.due_date < data.issue_date) throw new Error("The due date cannot be before the issue date.");

    const { data: sRow } = await context.supabase.from("billing_settings").select("vat_mode, due_days").eq("id", 1).limit(1);
    const mode = (sRow?.[0]?.vat_mode as BillingSettings["vat_mode"]) ?? "exclusive";

    let amount = round2(data.amount);
    let vatAmount = 0;
    let total = amount;
    if (mode === "exclusive") {
      vatAmount = round2(amount * (VAT_RATE / 100));
      total = round2(amount + vatAmount);
    } else if (mode === "inclusive") {
      amount = round2(data.amount / (1 + VAT_RATE / 100));
      vatAmount = round2(data.amount - amount);
      total = round2(data.amount);
    }

    const { data: made, error: nErr } = await context.supabase.rpc("next_invoice_number", { _prefix: PREFIX });
    if (nErr || !made) throw new Error(nErr?.message || "The invoice number could not be created.");

    const row: InvoiceInsert = {
      number: made,
      user_id: data.user_id,
      issue_date: data.issue_date,
      due_date: data.due_date,
      period_label: data.period_label ?? "",
      description: data.description,
      amount,
      vat_rate: mode === "none" ? 0 : VAT_RATE,
      vat_amount: vatAmount,
      total,
      status: "Sent",
      created_by: context.userId,
    };
    const { error } = await context.supabase.from("invoices").insert(row);
    if (error) throw new Error(error.message);
    return { number: made, amount, vat_amount: vatAmount, total, vat_mode: mode };
  });

export const updateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      paid_method: z.string().trim().max(40).optional(),
      status: z.enum(["Draft", "Sent", "Paid", "Void"]).optional(),
      note: z.string().trim().max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const patch: Database["public"]["Tables"]["invoices"]["Update"] = { updated_at: new Date().toISOString() };
    if (data.paid_on !== undefined) patch.paid_on = data.paid_on;
    if (data.paid_method !== undefined) patch.paid_method = data.paid_method;
    if (data.status !== undefined) patch.status = data.status;
    if (data.note !== undefined) patch.note = data.note;
    if (data.status === "Paid" && !data.paid_on) patch.paid_on = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase.from("invoices").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: found, error: fErr } = await context.supabase.from("invoices").select("*").eq("id", data.id).limit(1);
    const inv = found?.[0];
    if (fErr || !inv) throw new Error("That invoice no longer exists.");

    const [reg, set] = await Promise.all([
      context.supabase.from("client_accounts").select("company, contact_name, billing_email, email, vat_ref").eq("user_id", inv.user_id).limit(1),
      context.supabase.from("billing_settings").select("*").eq("id", 1).limit(1),
    ]);
    const c = reg.data?.[0];
    const s = set.data?.[0];
    const to = c?.billing_email || c?.email || "";
    if (!to) throw new Error("That client has no email address on file.");

    const zar = (n: number) => `R ${n.toFixed(2)}`;
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const r = await sendTemplateEmail("invoice", to, {
      templateData: {
        contact_name: c?.contact_name ?? "",
        company: c?.company ?? "",
        invoice_number: inv.number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        description: inv.description,
        period_label: inv.period_label,
        subtotal: zar(Number(inv.amount)),
        vat_line: Number(inv.vat_amount) > 0 ? `VAT at ${Number(inv.vat_rate)}%` : "No VAT charged",
        vat_amount: zar(Number(inv.vat_amount)),
        total: zar(Number(inv.total)),
        bank_name: s?.bank_name ?? "",
        account_name: s?.account_name ?? "",
        account_number: s?.account_number ?? "",
        branch_code: s?.branch_code ?? "",
        reference: inv.number,
        payfast_link: s?.payfast_link ?? "",
        vat_number: s?.vat_number ?? "",
        client_vat_ref: c?.vat_ref ?? "",
      },
    });

    if (r.sent === true) {
      const { error } = await context.supabase.from("invoices").update({ emailed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", inv.id);
      if (error) throw new Error(error.message);
    }
    return { sent: r.sent === true, to, reason: r.sent === false ? r.reason : "" };
  });

export const setClientFees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      monthly_fee: z.coerce.number().min(0).max(10000000).nullable(),
      annual_fee: z.coerce.number().min(0).max(10000000).nullable(),
      billing_email: z.string().trim().max(255),
      vat_ref: z.string().trim().max(40),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("client_accounts")
      .update({
        monthly_fee: data.monthly_fee,
        annual_fee: data.annual_fee,
        billing_email: data.billing_email,
        vat_ref: data.vat_ref,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
