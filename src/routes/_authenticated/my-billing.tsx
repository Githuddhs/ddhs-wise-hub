import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { card, mono, primaryBtn } from "@/lib/ui";
import { getMyBilling, startPayfastCheckout, type MyInvoice } from "@/lib/payfast.functions";
import { zar } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/_authenticated/my-billing")({
  validateSearch: (s: Record<string, unknown>) => ({ paid: s["paid"] ? 1 : undefined, cancelled: s["cancelled"] ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: "Billing — DDHS Equity Intelligence" },
      { name: "description", content: "See your DDHS invoices and pay your subscription monthly by PayFast debit order." },
      { property: "og:title", content: "Billing — DDHS Equity Intelligence" },
      { property: "og:description", content: "Your DDHS invoices and monthly PayFast payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyBilling,
});

function submitToPayfast(action: string, fields: [string, string][]) {
  const f = document.createElement("form");
  f.method = "POST";
  f.action = action;
  for (const [k, v] of fields) {
    const i = document.createElement("input");
    i.type = "hidden"; i.name = k; i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

function MyBilling() {
  const search = Route.useSearch();
  const q = useQuery({ queryKey: ["my-billing"], queryFn: () => getMyBilling(), refetchInterval: search.paid ? 5000 : false });
  const pay = useMutation({
    mutationFn: (inv: MyInvoice) => startPayfastCheckout({ data: { invoiceId: inv.id, origin: window.location.origin } }),
    onSuccess: (r) => submitToPayfast(r.action, r.fields),
    onError: (e) => toast.error(e instanceof Error ? e.message : "PayFast could not be opened"),
  });
  const sub = q.data?.subscription;
  const invoices = q.data?.invoices ?? [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <AppNav />
      <h1 className="font-[Fraunces] text-3xl font-semibold">Billing</h1>
      <p className="mt-2 text-muted">Pay an invoice once with PayFast and the same amount is debited monthly after that. You can still pay by EFT using the banking details on the invoice.</p>

      {search.paid && <p className={`${card} mt-6`}>Thank you — PayFast is confirming your payment. This page updates on its own within a minute.</p>}
      {search.cancelled && <p className={`${card} mt-6`}>Payment cancelled. Nothing was charged.</p>}

      <section className={`${card} mt-6`}>
        <p className={mono}>Monthly debit order</p>
        {sub?.status === "Active" ? (
          <p className="mt-2">Active — {sub.recurring_amount != null ? zar(sub.recurring_amount) : ""} a month{sub.last_payment_at ? `, last paid ${sub.last_payment_at.slice(0, 10)}` : ""}.</p>
        ) : sub?.status === "Cancelled" ? (
          <p className="mt-2">Cancelled. Pay an outstanding invoice below to start it again.</p>
        ) : (
          <p className="mt-2 text-muted">Not set up yet. Choose "Pay monthly with PayFast" on an outstanding invoice.</p>
        )}
      </section>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <p className={mono}>Your invoices</p>
        {q.isLoading ? <p className="mt-3 text-muted">Loading…</p> : invoices.length === 0 ? (
          <p className="mt-3 text-muted">No invoices yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-2">Invoice</th><th>Period</th><th>Due</th><th className="text-right">Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-line/50">
                  <td className="py-2 font-[JetBrains_Mono]">{i.number}</td>
                  <td>{i.period_label}</td>
                  <td>{i.due_date}</td>
                  <td className="text-right">{zar(i.total)}</td>
                  <td>{i.status === "Paid" ? `Paid ${i.paid_on ?? ""}` : "Outstanding"}</td>
                  <td className="text-right">
                    {i.status === "Sent" && sub?.status !== "Active" && (
                      <button className={primaryBtn} disabled={pay.isPending} onClick={() => pay.mutate(i)} aria-label={`Pay ${i.number} monthly with PayFast`}>
                        {pay.isPending ? "Opening PayFast…" : "Pay monthly with PayFast"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
