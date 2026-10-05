ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Existing staff/self-signed accounts are treated as already onboarded so the
-- wizard only greets accounts created from now on.
UPDATE public.profiles SET onboarded_at = now() WHERE onboarded_at IS NULL;