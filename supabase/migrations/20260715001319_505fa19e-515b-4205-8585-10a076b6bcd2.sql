CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_code TEXT;
  v_referrer UUID;
  v_is_first BOOLEAN;
  v_now TIMESTAMPTZ := now();
  v_terms TIMESTAMPTZ;
  v_privacy TIMESTAMPTZ;
  v_referral TIMESTAMPTZ;
BEGIN
  v_ref_code := public.generate_referral_code();

  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    SELECT id INTO v_referrer FROM public.profiles
    WHERE referral_code = upper(NEW.raw_user_meta_data->>'referral_code') LIMIT 1;
    IF v_referrer = NEW.id THEN v_referrer := NULL; END IF;
  END IF;

  -- If signup metadata carried agreement flags/timestamps, persist them
  IF NEW.raw_user_meta_data ? 'agreed_terms_at' THEN
    v_terms := COALESCE((NEW.raw_user_meta_data->>'agreed_terms_at')::timestamptz, v_now);
  END IF;
  IF NEW.raw_user_meta_data ? 'agreed_privacy_at' THEN
    v_privacy := COALESCE((NEW.raw_user_meta_data->>'agreed_privacy_at')::timestamptz, v_now);
  END IF;
  IF NEW.raw_user_meta_data ? 'agreed_referral_policy_at' THEN
    v_referral := COALESCE((NEW.raw_user_meta_data->>'agreed_referral_policy_at')::timestamptz, v_now);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, referral_code, referred_by,
                               agreed_terms_at, agreed_privacy_at, agreed_referral_policy_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone',
    v_ref_code,
    v_referrer,
    v_terms, v_privacy, v_referral
  );

  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_is_first;
  IF v_is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END; $function$;