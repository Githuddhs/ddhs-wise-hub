CREATE OR REPLACE FUNCTION public.write_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN j := to_jsonb(OLD); ELSE j := to_jsonb(NEW); END IF;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, summary)
  VALUES ((j->>'user_id')::uuid, TG_TABLE_NAME, (j->>'id')::uuid, TG_OP,
    left(coalesce(j->>'measure', j->>'decision', j->>'title', j->>'description', j->>'objective', j->>'file_name', j->>'grp'), 200));
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.write_audit() FROM PUBLIC, anon, authenticated;