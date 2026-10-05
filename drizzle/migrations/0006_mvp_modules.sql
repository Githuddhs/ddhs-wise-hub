CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  employee_no text NOT NULL CHECK (char_length(employee_no) BETWEEN 1 AND 40),
  level text CHECK (level IN ('top','senior','professional','skilled','semi','unskilled')),
  race text CHECK (race IN ('A','C','I','W')),
  gender text CHECK (gender IN ('M','F')),
  disability boolean NOT NULL DEFAULT false,
  foreign_national boolean NOT NULL DEFAULT false,
  department text CHECK (char_length(department) <= 100),
  start_date date,
  end_date date,
  promoted_on date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, employee_no)
);
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  file_name text NOT NULL CHECK (char_length(file_name) <= 255),
  mode text NOT NULL CHECK (mode IN ('merge','replace')),
  row_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid() UNIQUE,
  title text NOT NULL DEFAULT 'Employment Equity Plan' CHECK (char_length(title) <= 150),
  start_date date,
  end_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.plan_barriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  plan_id uuid NOT NULL REFERENCES public.ee_plans(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (char_length(category) <= 80),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  affected_groups text CHECK (char_length(affected_groups) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.plan_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  plan_id uuid NOT NULL REFERENCES public.ee_plans(id) ON DELETE CASCADE,
  level text NOT NULL,
  grp text NOT NULL CHECK (char_length(grp) <= 40),
  year int NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  current_pct numeric,
  target_pct numeric NOT NULL CHECK (target_pct BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.plan_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  plan_id uuid NOT NULL REFERENCES public.ee_plans(id) ON DELETE CASCADE,
  year int NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  objective text NOT NULL CHECK (char_length(objective) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.plan_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  plan_id uuid NOT NULL REFERENCES public.ee_plans(id) ON DELETE CASCADE,
  barrier_id uuid REFERENCES public.plan_barriers(id) ON DELETE SET NULL,
  measure text NOT NULL CHECK (char_length(measure) BETWEEN 1 AND 1000),
  owner text CHECK (char_length(owner) <= 100),
  milestones text CHECK (char_length(milestones) <= 2000),
  due_date date,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In progress','Done')),
  reminded_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  decided_on date NOT NULL,
  decision text NOT NULL CHECK (char_length(decision) BETWEEN 1 AND 2000),
  made_by text CHECK (char_length(made_by) <= 150),
  meeting_id uuid REFERENCES public.committee_meetings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  category text NOT NULL CHECK (category IN ('consultation','minutes','policy','barriers','submission','training','analysis','other')),
  description text CHECK (char_length(description) <= 2000),
  body text CHECK (char_length(body) <= 100000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.evidence_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  item_id uuid NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  version int NOT NULL,
  path text NOT NULL,
  file_name text NOT NULL CHECK (char_length(file_name) <= 255),
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, version)
);
CREATE TABLE public.evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  item_id uuid NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('measure','action','decision')),
  target_id uuid NOT NULL,
  UNIQUE (item_id, target_type, target_id)
);
CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  summary text,
  at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees, public.import_batches, public.ee_plans, public.plan_barriers, public.plan_goals, public.plan_objectives, public.plan_measures, public.decisions, public.evidence_items, public.evidence_versions, public.evidence_links TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.employees, public.import_batches, public.ee_plans, public.plan_barriers, public.plan_goals, public.plan_objectives, public.plan_measures, public.decisions, public.evidence_items, public.evidence_versions, public.evidence_links, public.audit_log TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['employees','import_batches','ee_plans','plan_barriers','plan_goals','plan_objectives','plan_measures','decisions','evidence_items','evidence_versions','evidence_links'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Own rows" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own audit" ON public.audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX ON public.employees (user_id);
CREATE INDEX ON public.plan_measures (due_date) WHERE status <> 'Done';
CREATE INDEX ON public.audit_log (user_id, at DESC);

CREATE OR REPLACE FUNCTION public.write_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; s text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  s := CASE TG_TABLE_NAME
    WHEN 'plan_measures' THEN r.measure
    WHEN 'decisions' THEN r.decision
    WHEN 'evidence_items' THEN r.title
    WHEN 'committee_actions' THEN r.title
    WHEN 'plan_barriers' THEN r.description
    ELSE NULL END;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, summary)
  VALUES (r.user_id, TG_TABLE_NAME, r.id, TG_OP, left(s, 200));
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.write_audit() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['plan_barriers','plan_goals','plan_objectives','plan_measures','decisions','evidence_items','evidence_versions','evidence_links','committee_actions','import_batches'] LOOP
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit()', t, t);
  END LOOP;
END $$;