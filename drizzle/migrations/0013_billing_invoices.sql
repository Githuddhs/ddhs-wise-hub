-- Billing: DDHS raises invoices that clients settle by EFT. Staff-only; clients never see these tables.

CREATE TABLE public.billing_settings (
  id int PRIMARY KEY CHECK (id = 1),
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  branch_code text NOT NULL DEFAULT '',
  vat_number text NOT NULL DEFAULT '',
  vat_mode text NOT NULL DEFAULT 'exclusive' CHECK (vat_mode IN ('exclusive','inclusive','none')),
  payfast_link text NOT NULL DEFAULT '',
  due_days int NOT NULL DEFAULT 14,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.billing_settings TO authenticated;
GRANT ALL ON public.billing_settings TO service_role;
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage billing settings" ON public.billing_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Invoice numbers count up once per year, e.g. DDHS-2026-0001.
CREATE TABLE public.invoice_counter (
  yr int PRIMARY KEY,
  last int NOT NULL DEFAULT 0
);
GRANT SELECT, UPDATE ON public.invoice_counter TO authenticated;
GRANT ALL ON public.invoice_counter TO service_role;
ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read the invoice counter" ON public.invoice_counter FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.next_invoice_number(_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y int := extract(year FROM current_date)::int; n int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Staff accounts only';
  END IF;
  INSERT INTO public.invoice_counter (yr, last) VALUES (y, 1)
    ON CONFLICT (yr) DO UPDATE SET last = public.invoice_counter.last + 1
    RETURNING last INTO n;
  RETURN coalesce(nullif(trim(_prefix), ''), 'INV') || '-' || y || '-' || lpad(n::text, 4, '0');
END $$;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(text) TO authenticated, service_role;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  period_label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  vat_rate numeric(5,2) NOT NULL DEFAULT 0,
  vat_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Sent' CHECK (status IN ('Draft','Sent','Paid','Void')),
  paid_on date,
  paid_method text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  emailed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Agreed fees per client, so an invoice can be raised in one click.
ALTER TABLE public.client_accounts ADD COLUMN monthly_fee numeric(12,2);
ALTER TABLE public.client_accounts ADD COLUMN annual_fee numeric(12,2);
ALTER TABLE public.client_accounts ADD COLUMN billing_email text NOT NULL DEFAULT '';
ALTER TABLE public.client_accounts ADD COLUMN vat_ref text NOT NULL DEFAULT '';