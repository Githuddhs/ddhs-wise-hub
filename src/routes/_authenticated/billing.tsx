import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { useIsStaff } from "@/hooks/use-is-staff";
import {
  createInvoice,
  getBillingSettings,
  listInvoices,
  saveBillingSettings,
  sendInvoiceEmail,
  setClientFees,
  updateInvoice,
  type BillingSettings,
  type Invoice,
} from "@/lib/billing.functions";
import { listClients, type ClientSummary } from "@/lib/admin.functions";
import { exportInvoicePdf, zar } from "@/lib/invoice-pdf";
import { btn, card, input, primaryBtn, todayIso } from "@/lib/ui";

const FILTERS = ["Outstanding", "Overdue", "Paid", "Voided", "All"] as const;
type Filter = (typeof FILTERS)[number];

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const monthName = () =>
  new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

const req = (s: string) => (
  <>
    {s} <span className="text-destructive">*</span>
  </>
);

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Invoices & payments — DDHS Equity Intelligence" },
      {
        name: "description",
        content:
          "Raise tax invoices for client accounts, send the banking details for EFT settlement, and keep a record of what has been paid.",
      },
      { property: "og:title", content: "Invoices & payments — DDHS Equity Intelligence" },
      {
        property: "og:description",
        content: "Raise tax invoices for client accounts and record EFT settlements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { isStaff, checked } = useIsStaff();
  const qc = useQueryClient();
  const today = todayIso();

  const settings = useQuery({ queryKey: ["billing-settings"], queryFn: () => getBillingSettings(), enabled: isStaff });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices(), enabled: isStaff });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients(), enabled: isStaff });

  const [form, setForm] = useState<BillingSettings>({
    bank_name: "",
    account_name: "",
    account_number: "",
    branch_code: "",
    vat_number: "",
    vat_mode: "exclusive",
    payfast_link: "",
    due_days: 14,
  });
  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const [filter, setFilter] = useState<Filter>("Outstanding");
  const [pick, setPick] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [desc, setDesc] = useState("Equity Intelligence platform — monthly subscription");
  const [period, setPeriod] = useState(monthName());
  const [amount, setAmount] = useState("");
  const [issue, setIssue] = useState(today);
  const [due, setDue] = useState(addDays(today, 14));

  const rows = invoices.data ?? [];
  const clientRows = useMemo(() => [...(clients.data ?? [])].sort((a, b) => a.company.localeCompare(b.company)), [clients.data]);

  const shown = useMemo(() => {
    const t = todayIso();
    return rows.filter((i) => {
      if (filter === "Outstanding") return i.status === "Sent";
      if (filter === "Overdue") return i.status === "Sent" && i.due_date < t;
      if (filter === "Paid") return i.status === "Paid";
      if (filter === "Voided") return i.status === "Void";
      return true;
    });
  }, [rows, filter]);

  const totals = useMemo(() => {
    const t = todayIso();
    const year = t.slice(0, 4);
    const outstanding = rows.filter((i) => i.status === "Sent");
    const overdue = outstanding.filter((i) => i.due_date < t);
    const paid = rows.filter((i) => i.status === "Paid" && (i.paid_on ?? "").startsWith(year));
    const sum = (l: Invoice[]) => l.reduce((a, i) => a + i.total, 0);
    return {
      outstanding: outstanding.length,
      outstandingValue: sum(outstanding),
      overdue: overdue.length,
      overdueValue: sum(overdue),
      paidValue: sum(paid),
    };
  }, [rows]);

  const saveSettings = useMutation({
    mutationFn: () => saveBillingSettings({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-settings"] });
      toast.success("Banking details saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the banking details"),
  });

  const raise = useMutation({
    mutationFn: () =>
      createInvoice({
        data: {
          user_id: pick,
          description: desc,
          period_label: period,
          amount: Number(amount),
          issue_date: issue,
          due_date: due,
        },
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setAmount("");
      toast.success(`Invoice ${r.number} raised — ${zar(r.total)}${r.vat_mode === "none" ? " (no VAT)" : " including VAT"}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The invoice could not be raised"),
  });

  const email = useMutation({
    mutationFn: (id: string) => sendInvoiceEmail({ data: { id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      if (r.sent) toast.success(`Sent to ${r.to}`);
      else toast.error(`The email did not go out (${r.reason}). The invoice is still here.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The email could not be sent"),
  });

  const patch = useMutation({
    mutationFn: (v: { id: string; paid_on?: string | null; paid_method?: string; status?: Invoice["status"] }) =>
      updateInvoice({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "That change could not be saved"),
  });

  function chooseClient(id: string) {
    setPick(id);
    const c = clientRows.find((r) => r.user_id === id);
    if (!c) return;
    const fee = cycle === "monthly" ? c.monthly_fee : c.annual_fee;
    if (fee) setAmount(String(fee));
    setPeriod(cycle === "monthly" ? monthName() : `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`);
  }

  function chooseCycle(next: "monthly" | "annual") {
    setCycle(next);
    setDesc(`Equity Intelligence platform — ${next} subscription`);
    const c = clientRows.find((r) => r.user_id === pick);
    const fee = c ? (next === "monthly" ? c.monthly_fee : c.annual_fee) : null;
    if (fee) setAmount(String(fee));
    setPeriod(next === "monthly" ? monthName() : `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`);
  }

  async function downloadPdf(i: Invoice) {
    const c = clientRows.find((r) => r.user_id === i.user_id);
    try {
      await exportInvoicePdf({
        number: i.number,
        issue_date: i.issue_date,
        due_date: i.due_date,
        company: i.company,
        contact_name: i.contact_name,
        billing_email: i.billing_email,
        client_vat_ref: c?.vat_ref ?? "",
        description: i.description,
        period_label: i.period_label,
        amount: i.amount,
        vat_rate: i.vat_rate,
        vat_amount: i.vat_amount,
        total: i.total,
        vat_number: form.vat_number,
        bank_name: form.bank_name,
        account_name: form.account_name,
        account_number: form.account_number,
        branch_code: form.branch_code,
        payfast_link: form.payfast_link,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The PDF could not be created");
    }
  }

  const vatNote =
    form.vat_mode === "exclusive"
      ? "Enter the amount excluding VAT — VAT at 15% is added and shown as a separate line."
      : form.vat_mode === "inclusive"
        ? "Enter the amount your client pays — the VAT portion is worked out from it."
        : "VAT is switched off, so invoices show no VAT line.";

  return (
    <main className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-foreground">Invoices &amp; payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Raise a tax invoice for a client, send it with DDHS banking details for EFT settlement, and record the payment when the
            money lands. Nothing here is visible to clients.
          </p>
        </div>

        {checked && !isStaff && (
          <div className={card}>
            <p className="text-sm text-foreground">This page is for DDHS staff accounts only.</p>
          </div>
        )}

        {isStaff && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Outstanding", value: `${totals.outstanding}`, sub: zar(totals.outstandingValue) },
                { label: "Overdue", value: `${totals.overdue}`, sub: zar(totals.overdueValue) },
                { label: "Paid this year", value: zar(totals.paidValue), sub: "settled invoices" },
                { label: "Clients", value: `${clientRows.length}`, sub: "on the register" },
              ].map((s) => (
                <div key={s.label} className={card}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
                  <div className="mt-2 font-display text-2xl text-foreground">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
                </div>
              ))}
            </div>

            <section className={`${card} mb-6`}>
              <h2 className="font-display text-lg text-foreground">Raise an invoice</h2>
              <p className="mt-1 text-xs text-muted-foreground">{vatNote}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-foreground">{req("Client")}</span>
                  <select className={`${input} mt-1`} value={pick} aria-label="Invoice client" onChange={(e) => chooseClient(e.target.value)}>
                    <option value="">Choose a client…</option>
                    {clientRows.map((c) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.company || c.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">{req("Billing")}</span>
                  <select className={`${input} mt-1`} value={cycle} aria-label="Billing period" onChange={(e) => chooseCycle(e.target.value as "monthly" | "annual")}>
                    <option value="monthly">Monthly subscription</option>
                    <option value="annual">Annual subscription</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">{req("Amount")}</span>
                  <input
                    className={`${input} mt-1`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00" aria-label="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-foreground">{req("Description")}</span>
                  <input className={`${input} mt-1`} value={desc} aria-label="Description" onChange={(e) => setDesc(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">Period</span>
                  <input className={`${input} mt-1`} value={period} aria-label="Period" onChange={(e) => setPeriod(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">{req("Invoice date")}</span>
                  <input
                    className={`${input} mt-1`}
                    type="date"
                    value={issue} aria-label="Invoice date"
                    onChange={(e) => {
                      setIssue(e.target.value);
                      setDue(addDays(e.target.value, form.due_days));
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">{req("Due by")}</span>
                  <input className={`${input} mt-1`} type="date" value={due} aria-label="Due by" onChange={(e) => setDue(e.target.value)} />
                </label>
                <div className="flex items-end">
                  <button
                    className={`${primaryBtn} w-full`}
                    disabled={!pick || !desc.trim() || !Number(amount) || raise.isPending}
                    onClick={() => raise.mutate()}
                  >
                    {raise.isPending ? "Raising…" : "Raise invoice"}
                  </button>
                </div>
              </div>
            </section>

            <section className={`${card} mb-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg text-foreground">Invoices</h2>
                <div className="flex flex-wrap gap-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {shown.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No invoices in this view.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        <th className="py-2 pr-4">Number</th>
                        <th className="py-2 pr-4">Client</th>
                        <th className="py-2 pr-4">Period</th>
                        <th className="py-2 pr-4">Due</th>
                        <th className="py-2 pr-4 text-right">Total</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((i) => {
                        const late = i.status === "Sent" && i.due_date < today;
                        return (
                          <tr key={i.id} className="border-b border-border/60 align-top">
                            <td className="py-3 pr-4 font-mono text-xs text-foreground">{i.number}</td>
                            <td className="py-3 pr-4 text-foreground">{i.company || "—"}</td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">{i.period_label || "—"}</td>
                            <td className={`py-3 pr-4 text-xs ${late ? "text-destructive" : "text-muted-foreground"}`}>
                              {i.due_date}
                              {late ? " · overdue" : ""}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-xs text-foreground">{zar(i.total)}</td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">
                              {i.status === "Paid" ? `Paid ${i.paid_on ?? ""}${i.paid_method ? ` · ${i.paid_method}` : ""}` : i.status}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                <button className={`${btn} text-xs`} disabled={email.isPending} onClick={() => email.mutate(i.id)}>
                                  {i.emailed_at ? "Email again" : "Email"}
                                </button>
                                <button className={`${btn} text-xs`} onClick={() => void downloadPdf(i)}>
                                  PDF
                                </button>
                                {i.status !== "Paid" && i.status !== "Void" && (
                                  <button className={`${btn} text-xs`} disabled={patch.isPending} onClick={() => patch.mutate({ id: i.id, status: "Paid", paid_method: "EFT" })}>
                                    Mark paid
                                  </button>
                                )}
                                {i.status === "Paid" && (
                                  <>
                                    <input
                                      className={`${input} w-36 text-xs`}
                                      type="date"
                                      value={i.paid_on ?? ""}
                                      onChange={(e) => patch.mutate({ id: i.id, paid_on: e.target.value })}
                                    />
                                    <button className={`${btn} text-xs`} disabled={patch.isPending} onClick={() => patch.mutate({ id: i.id, status: "Sent", paid_on: null })}>
                                      Undo
                                    </button>
                                  </>
                                )}
                                {i.status !== "Void" && (
                                  <button
                                    className={`${btn} text-xs`}
                                    disabled={patch.isPending}
                                    onClick={() => {
                                      if (window.confirm(`Void invoice ${i.number}? It stays on record but is no longer owed.`)) {
                                        patch.mutate({ id: i.id, status: "Void" });
                                      }
                                    }}
                                  >
                                    Void
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className={`${card} mb-6`}>
              <h2 className="font-display text-lg text-foreground">Agreed fees</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Set what each client pays. A fee filled in here prefills the amount when you raise that client's invoice.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Debit order</th>
                      <th className="py-2 pr-4">Monthly</th>
                      <th className="py-2 pr-4">Annual</th>
                      <th className="py-2 pr-4">Invoice to</th>
                      <th className="py-2">Client VAT ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRows.map((c) => (
                      <FeeRow key={c.user_id} c={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={card}>
              <h2 className="font-display text-lg text-foreground">Banking &amp; VAT</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                These details print on every invoice and go in every invoice email. Fill them in once — nothing is invented here.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["bank_name", "Bank"],
                    ["account_name", "Account name"],
                    ["account_number", "Account number"],
                    ["branch_code", "Branch code"],
                    ["vat_number", "DDHS VAT number"],
                    ["payfast_link", "Pay online link (optional)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <input
                      className={`${input} mt-1`}
                      value={form[key]} aria-label={label}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="text-xs font-medium text-foreground">VAT handling</span>
                  <select
                    className={`${input} mt-1`}
                    value={form.vat_mode} aria-label="VAT handling"
                    onChange={(e) => setForm((f) => ({ ...f, vat_mode: e.target.value as BillingSettings["vat_mode"] }))}
                  >
                    <option value="exclusive">Amounts exclude VAT (15% added)</option>
                    <option value="inclusive">Amounts include VAT (15% extracted)</option>
                    <option value="none">No VAT</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">Payment due (days)</span>
                  <input
                    className={`${input} mt-1`}
                    type="number"
                    min="0"
                    max="90"
                    value={form.due_days} aria-label="Payment due days"
                    onChange={(e) => setForm((f) => ({ ...f, due_days: Number(e.target.value) }))}
                  />
                </label>
                <div className="flex items-end">
                  <button className={`${primaryBtn} w-full`} disabled={saveSettings.isPending} onClick={() => saveSettings.mutate()}>
                    {saveSettings.isPending ? "Saving…" : "Save banking details"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function FeeRow({ c }: { c: ClientSummary }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (patch: Partial<{ monthly_fee: number | null; annual_fee: number | null; billing_email: string; vat_ref: string }>) =>
      setClientFees({
        data: {
          user_id: c.user_id,
          monthly_fee: patch.monthly_fee ?? c.monthly_fee,
          annual_fee: patch.annual_fee ?? c.annual_fee,
          billing_email: patch.billing_email ?? c.billing_email,
          vat_ref: patch.vat_ref ?? c.vat_ref,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Fees saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The fees could not be saved"),
  });

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <tr className="border-b border-border/60">
      <td className="py-2 pr-4 text-foreground">{c.company || c.email}</td>
      <td className="py-2 pr-4 text-xs">{c.billing_status === "Paid" ? `Paid to ${c.paid_through ?? ""}` : c.billing_status}</td>
      <td className="py-2 pr-4">
        <input
          className={`${input} w-24 text-xs`}
          type="number"
          min="0"
          step="0.01"
          defaultValue={c.monthly_fee ?? ""} aria-label="Monthly fee"
          onBlur={(e) => {
            const v = num(e.target.value);
            if (v !== c.monthly_fee) save.mutate({ monthly_fee: v });
          }}
        />
      </td>
      <td className="py-2 pr-4">
        <input
          className={`${input} w-24 text-xs`}
          type="number"
          min="0"
          step="0.01"
          defaultValue={c.annual_fee ?? ""} aria-label="Annual fee"
          onBlur={(e) => {
            const v = num(e.target.value);
            if (v !== c.annual_fee) save.mutate({ annual_fee: v });
          }}
        />
      </td>
      <td className="py-2 pr-4">
        <input
          className={`${input} w-56 text-xs`}
          defaultValue={c.billing_email} aria-label="Invoice to email"
          placeholder={c.email}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== c.billing_email) save.mutate({ billing_email: v });
          }}
        />
      </td>
      <td className="py-2">
        <input
          className={`${input} w-32 text-xs`}
          defaultValue={c.vat_ref} aria-label="Client VAT reference"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== c.vat_ref) save.mutate({ vat_ref: v });
          }}
        />
      </td>
    </tr>
  );
}
