CREATE TABLE public.workforce_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  sector text CHECK (char_length(sector) <= 200),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.saved_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  tool text NOT NULL CHECK (tool IN ('assess','plan','progress','review')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (char_length(content) <= 100000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.compliance_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_profiles, public.saved_results, public.compliance_deadlines TO authenticated;
GRANT ALL ON public.workforce_profiles, public.saved_results, public.compliance_deadlines TO service_role;
ALTER TABLE public.workforce_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workforce" ON public.workforce_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own results" ON public.saved_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own deadlines" ON public.compliance_deadlines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX saved_results_user_idx ON public.saved_results(user_id, created_at DESC);