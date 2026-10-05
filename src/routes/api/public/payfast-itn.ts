import { createFileRoute } from "@tanstack/react-router";

// PayFast payment notification (ITN). Called by PayFast for the first payment and
// every monthly debit after it. Verifies the signature and asks PayFast to confirm
// the notification before marking anything paid.
export const Route = createFileRoute("/api/public/payfast-itn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { payfastConfig, md5, pfEncode } = await import("@/lib/payfast.server");
        const cfg = payfastConfig();
        const raw = await request.text();
        const pairs = raw.split("&").filter(Boolean);
        const params = new URLSearchParams(raw);
        const given = params.get("signature") ?? "";
        const unsigned = pairs.filter((p) => !p.startsWith("signature=")).join("&");
        const expected = md5(cfg.passphrase ? `${unsigned}&passphrase=${pfEncode(cfg.passphrase)}` : unsigned);
        if (!given || given !== expected) return new Response("Bad signature", { status: 400 });

        const check = await fetch(`https://${cfg.host}/eng/query/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: unsigned,
        }).then((r) => r.text()).catch(() => "");
        if (check.trim() !== "VALID") return new Response("Not confirmed", { status: 400 });

        const pfId = params.get("pf_payment_id") ?? "";
        const status = params.get("payment_status") ?? "";
        const firstInvoiceId = params.get("m_payment_id") ?? "";
        const userId = params.get("custom_str1") ?? "";
        const gross = Number(params.get("amount_gross") ?? "0");
        const token = params.get("token") ?? null;
        if (!pfId || !userId) return new Response("Missing fields", { status: 400 });

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: first } = await db.from("invoices").select("id,user_id,status,total").eq("id", firstInvoiceId).maybeSingle();
        if (!first || first.user_id !== userId) return new Response("Unknown invoice", { status: 400 });

        const { data: fresh } = await db.from("payfast_payments")
          .upsert({ pf_payment_id: pfId, user_id: userId, amount_gross: gross, payment_status: status }, { onConflict: "pf_payment_id", ignoreDuplicates: true })
          .select("pf_payment_id");
        if (!fresh?.length) return new Response("ok"); // already handled

        const now = new Date();
        if (status === "COMPLETE") {
          let target = first.status === "Sent" && Math.abs(Number(first.total) - gross) < 0.01 ? first.id : null;
          if (!target) {
            const { data: open } = await db.from("invoices").select("id,total").eq("user_id", userId).eq("status", "Sent").order("due_date");
            target = open?.find((i) => Math.abs(Number(i.total) - gross) < 0.01)?.id ?? null;
          }
          if (target) {
            await db.from("invoices").update({ status: "Paid", paid_on: now.toISOString().slice(0, 10), paid_method: "PayFast debit order", updated_at: now.toISOString() }).eq("id", target);
            await db.from("payfast_payments").update({ invoice_id: target }).eq("pf_payment_id", pfId);
          }
          await db.from("payfast_subscriptions").upsert({ user_id: userId, token, status: "Active", recurring_amount: gross, first_invoice_id: first.id, last_payment_at: now.toISOString(), updated_at: now.toISOString() });
          const through = new Date(now); through.setMonth(through.getMonth() + 1);
          await db.from("client_accounts").update({ billing_status: "Paid", paid_through: through.toISOString().slice(0, 10) }).eq("user_id", userId);
        } else if (status === "CANCELLED") {
          await db.from("payfast_subscriptions").upsert({ user_id: userId, token, status: "Cancelled", first_invoice_id: first.id, updated_at: now.toISOString() });
          await db.from("client_accounts").update({ billing_status: "Cancelled" }).eq("user_id", userId);
        }
        return new Response("ok");
      },
    },
  },
});
