-- 1. Registration agreement tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agreed_terms_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreed_privacy_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreed_referral_policy_at TIMESTAMPTZ;

-- 2. Auto-complete tier purchase cycle when reward cap reached
CREATE OR REPLACE FUNCTION public.auto_complete_tier_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INT;
BEGIN
  IF NEW.cycle_status = 'active'
     AND NEW.rewarded_referrals_count IS DISTINCT FROM OLD.rewarded_referrals_count THEN
    SELECT max_referrals INTO v_max FROM public.tiers WHERE id = NEW.tier_id;
    IF v_max IS NOT NULL AND NEW.rewarded_referrals_count >= v_max THEN
      NEW.cycle_status := 'completed';
      NEW.completed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_tier_cycle ON public.tier_purchases;
CREATE TRIGGER trg_auto_complete_tier_cycle
BEFORE UPDATE ON public.tier_purchases
FOR EACH ROW EXECUTE FUNCTION public.auto_complete_tier_cycle();

-- 3. Notify user when their cycle completes
CREATE OR REPLACE FUNCTION public.notify_cycle_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_name TEXT;
BEGIN
  IF NEW.cycle_status = 'completed' AND OLD.cycle_status = 'active' THEN
    SELECT name INTO v_name FROM public.tiers WHERE id = NEW.tier_id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (NEW.user_id, 'Referral cycle completed',
      'Your ' || COALESCE(v_name,'tier') || ' referral cycle is complete. Renew the tier to start a new earning cycle.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cycle_completed ON public.tier_purchases;
CREATE TRIGGER trg_notify_cycle_completed
AFTER UPDATE ON public.tier_purchases
FOR EACH ROW EXECUTE FUNCTION public.notify_cycle_completed();