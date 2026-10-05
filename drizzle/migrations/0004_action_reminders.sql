ALTER TABLE public.committee_actions ADD COLUMN reminded_on date;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;