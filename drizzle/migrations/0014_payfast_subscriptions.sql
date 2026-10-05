-- PayFast monthly debit orders: clients can read their own invoices and pay them;
-- the PayFast notification (server, service role) records payments and flips status.
CREATE POLICY "Clients read own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.client_accounts ADD COLUMN billing_status text NOT NULL DEFAULT 'Unpaid'
  CHECK (billing_status IN ('Unpaid','Paid','Cancelled'));
ALTER TABLE public.client_accounts ADD COLUMN paid_through date;

CREATE TABLE public.payfast_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Active','Cancelled')),
  recurring_amount numeric(12,2),
  first_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  last_payment_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payfast_subscriptions TO authenticated;
GRANT ALL ON public.payfast_subscriptions TO service_role;
ALTER TABLE public.payfast_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and staff read subscriptions" ON public.payfast_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.payfast_payments (
  pf_payment_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount_gross numeric(12,2),
  payment_status text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payfast_payments TO authenticated;
GRANT ALL ON public.payfast_payments TO service_role;
ALTER TABLE public.payfast_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read payments" ON public.payfast_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));