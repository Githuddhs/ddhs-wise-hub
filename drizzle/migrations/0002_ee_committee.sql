CREATE TABLE public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  role text CHECK (char_length(role) <= 100),
  represents text CHECK (char_length(represents) <= 100),
  email text CHECK (char_length(email) <= 255),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.committee_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  meeting_date date NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  notes text CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.committee_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  meeting_id uuid REFERENCES public.committee_meetings(id) ON DELETE SET NULL,
  member_id uuid REFERENCES public.committee_members(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  due_date date,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In progress','Done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_members, public.committee_meetings, public.committee_actions TO authenticated;
GRANT ALL ON public.committee_members, public.committee_meetings, public.committee_actions TO service_role;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own members" ON public.committee_members FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own meetings" ON public.committee_meetings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own actions" ON public.committee_actions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);