CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  work_email text NOT NULL CHECK (char_length(work_email) <= 255),
  phone text CHECK (char_length(phone) <= 30),
  company text NOT NULL CHECK (char_length(company) BETWEEN 2 AND 150),
  job_title text CHECK (char_length(job_title) <= 100),
  company_size text NOT NULL CHECK (char_length(company_size) <= 30),
  message text CHECK (char_length(message) <= 1000),
  popia_consent boolean NOT NULL CHECK (popia_consent),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.demo_requests TO anon, authenticated;
GRANT ALL ON public.demo_requests TO service_role;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a demo request" ON public.demo_requests
  FOR INSERT TO anon, authenticated WITH CHECK (popia_consent = true);