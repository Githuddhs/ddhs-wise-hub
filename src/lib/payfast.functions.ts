import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// The published address PayFast calls back to (preview addresses are private).
const NOTIFY_URL = "https://ddhs-wise-hub.lovable.app/api/public/payfast-itn";

export type MyInvoice = {
  id: string;
  number: string;
  issue_date: string;
  due_date: string;
  period_label: string;
  description: string;
  total: number;
  status: string;
  paid_on: string | null;
  paid_method: string;
};

export const getMyBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [inv, sub] = await Promise.all([
      sb.from("invoices").select("id,number,issue_date,due_date,period_label,description,total,status,paid_on,paid_method")
        .eq("user_id", context.userId).neq("status", "Void").neq("status", "Draft").order("issue_date", { ascending: false }),
      sb.from("payfast_subscriptions").select("status,recurring_amount,last_payment_at").eq("user_id", context.userId).maybeSingle(),
    ]);
    if (inv.error) throw new Error(inv.error.message);
    return {
      invoices: (inv.data ?? []).map((r) => ({ ...r, total: Number(r.total) })) as MyInvoice[],
      subscription: sub.data ? { ...sub.data, recurring_amount: sub.data.recurring_amount == null ? null : Number(sub.data.recurring_amount) } : null,
    };
  });

/** Builds the signed PayFast form for a monthly debit starting with this invoice. */
export const startPayfastCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ invoiceId: z.string().uuid(), origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { payfastConfig, signFields } = await import("./payfast.server");
    const { data: inv, error } = await context.supabase.from("invoices")
      .select("id,number,total,status,user_id,description").eq("id", data.invoiceId).eq("user_id", context.userId).maybeSingle();
    if (error || !inv) throw new Error("That invoice could not be found.");
    if (inv.status !== "Sent") throw new Error("This invoice is not awaiting payment.");
    const origin = new URL(data.origin);
    if (origin.protocol !== "https:" && origin.hostname !== "localhost") throw new Error("Invalid return address.");
    const { data: prof } = await context.supabase.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const email = (context.claims as { email?: string }).email ?? "";
    const [first, ...rest] = (prof?.full_name ?? "").trim().split(/\s+/);
    const cfg = payfastConfig();
    const amount = Number(inv.total).toFixed(2);
    const today = new Date().toISOString().slice(0, 10);
    const fields: [string, string][] = [
      ["merchant_id", cfg.merchantId],
      ["merchant_key", cfg.merchantKey],
      ["return_url", `${origin.origin}/my-billing?paid=1`],
      ["cancel_url", `${origin.origin}/my-billing?cancelled=1`],
      ["notify_url", NOTIFY_URL],
      ["name_first", first ?? ""],
      ["name_last", rest.join(" ")],
      ["email_address", cfg.live ? email : ""],
      ["m_payment_id", inv.id],
      ["amount", amount],
      ["item_name", `DDHS Equity Intelligence ${inv.number}`.slice(0, 100)],
      ["custom_str1", context.userId],
      ["subscription_type", "1"],
      ["billing_date", today],
      ["recurring_amount", amount],
      ["frequency", "3"],
      ["cycles", "0"],
    ];
    const post = fields.filter(([, v]) => v !== "");
    post.push(["signature", signFields(post, cfg.passphrase)]);
    return { action: `https://${cfg.host}/eng/process`, fields: post, sandbox: !cfg.live };
  });
