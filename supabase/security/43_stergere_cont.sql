-- 43. Cereri de ștergere cont (Google Play + GDPR).
-- Tabel NOU. Nu modifică tabele, date sau politici RLS existente.
-- Doar service_role citește și scrie. Rulează acest fișier în Supabase
-- ÎNAINTE de a publica codul care folosește account_deletion_requests.
-- Se poate rula de mai multe ori.

DO $$ BEGIN
  CREATE ROLE anon;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  role text,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'web',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmation_code text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT account_deletion_requests_status_check
    CHECK (status IN ('unverified', 'pending', 'blocked', 'completed', 'cancelled')),
  CONSTRAINT account_deletion_requests_source_check
    CHECK (source IN ('web', 'app')),
  CONSTRAINT account_deletion_requests_role_check
    CHECK (role IS NULL OR role IN ('influencer', 'brand', 'admin', 'unknown'))
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_code_idx
  ON public.account_deletion_requests (confirmation_code);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_idx
  ON public.account_deletion_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS account_deletion_requests_email_idx
  ON public.account_deletion_requests (lower(email), created_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

NOTIFY pgrst, 'reload schema';

SELECT 'OK — cereri stergere cont' AS rezultat;
