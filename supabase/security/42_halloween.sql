-- 42. Halloween — „Trick or Treat” zilnic (25–31 octombrie).
-- Un dovleac pe zi pentru fiecare influencer aprobat (5–30 puncte) + bonus dacă deschide toate cele 7 zile.
-- Doar serverul citește/scrie tabela. Se poate rula de mai multe ori.

CREATE TABLE IF NOT EXISTS public.halloween_treats (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id  uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  day            date NOT NULL,
  kind           text NOT NULL DEFAULT 'daily' CHECK (kind IN ('daily','bonus')),
  points         integer NOT NULL CHECK (points BETWEEN 0 AND 500),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (influencer_id, day, kind)
);

CREATE INDEX IF NOT EXISTS halloween_treats_inf_idx ON public.halloween_treats (influencer_id, day);

ALTER TABLE public.halloween_treats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.halloween_treats FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
SELECT 'OK — Halloween' AS rezultat;
