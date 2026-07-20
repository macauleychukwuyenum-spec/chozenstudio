-- Harden role checks by moving the SECURITY DEFINER helper out of the exposed API schema.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_complete_tier_cycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_cycle_completed() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.auto_complete_tier_cycle() SECURITY INVOKER;
ALTER FUNCTION public.notify_cycle_completed() SECURITY INVOKER;

-- Admin client actions are still constrained by RLS policies below.
GRANT UPDATE ON public.referrals TO authenticated;
GRANT UPDATE, DELETE ON public.withdrawals TO authenticated;
GRANT INSERT, UPDATE ON public.wallets TO authenticated;
GRANT INSERT ON public.wallet_transactions TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;

ALTER TYPE public.referral_status ADD VALUE IF NOT EXISTS 'rejected';

-- Recreate policies that relied on the exposed public.has_role() helper.
DROP POLICY IF EXISTS "profiles admin all" ON public.profiles;
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles admin all" ON public.user_roles;
CREATE POLICY "user_roles admin all" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tiers public read" ON public.tiers;
CREATE POLICY "tiers public read" ON public.tiers FOR SELECT TO anon, authenticated
  USING (active = true OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tiers admin write" ON public.tiers;
CREATE POLICY "tiers admin write" ON public.tiers FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tier_purchases admin all" ON public.tier_purchases;
CREATE POLICY "tier_purchases admin all" ON public.tier_purchases FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "payments admin all" ON public.payments;
CREATE POLICY "payments admin all" ON public.payments FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "referrals admin all" ON public.referrals;
CREATE POLICY "referrals admin all" ON public.referrals FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "wallets admin all" ON public.wallets;
CREATE POLICY "wallets admin all" ON public.wallets FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "wallet_txn admin all" ON public.wallet_transactions;
CREATE POLICY "wallet_txn admin all" ON public.wallet_transactions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "withdrawals admin all" ON public.withdrawals;
CREATE POLICY "withdrawals admin all" ON public.withdrawals FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notifications admin all" ON public.notifications;
CREATE POLICY "notifications admin all" ON public.notifications FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "courses public read" ON public.courses;
CREATE POLICY "courses public read" ON public.courses FOR SELECT TO anon, authenticated
  USING (published = true OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "courses admin all" ON public.courses;
CREATE POLICY "courses admin all" ON public.courses FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "digital public read" ON public.digital_products;
CREATE POLICY "digital public read" ON public.digital_products FOR SELECT TO anon, authenticated
  USING (published = true OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "digital admin all" ON public.digital_products;
CREATE POLICY "digital admin all" ON public.digital_products FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "services public read" ON public.services;
CREATE POLICY "services public read" ON public.services FOR SELECT TO anon, authenticated
  USING (published = true OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "services admin all" ON public.services;
CREATE POLICY "services admin all" ON public.services FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "bookings admin all" ON public.service_bookings;
CREATE POLICY "bookings admin all" ON public.service_bookings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "blogs public read" ON public.blog_posts;
CREATE POLICY "blogs public read" ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published' OR auth.uid() = author_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "blogs admin all" ON public.blog_posts;
CREATE POLICY "blogs admin all" ON public.blog_posts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "contact admin read" ON public.contact_messages;
CREATE POLICY "contact admin read" ON public.contact_messages FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "settings admin write" ON public.app_settings;
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "audit admin read" ON public.audit_logs;
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "audit admin insert" ON public.audit_logs;
CREATE POLICY "audit admin insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

DROP POLICY IF EXISTS "ann admin all" ON public.announcements;
CREATE POLICY "ann admin all" ON public.announcements FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage lessons" ON public.course_lessons;
CREATE POLICY "Admins manage lessons" ON public.course_lessons FOR ALL
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read own progress" ON public.lesson_progress;
CREATE POLICY "Users read own progress" ON public.lesson_progress FOR SELECT
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

-- Storage policies: private course/product files now require matching access.
DROP POLICY IF EXISTS "blog_auth_write" ON storage.objects;
CREATE POLICY "blog_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND (
      private.has_role(auth.uid(), 'admin')
      OR (
        (storage.foldername(name))[1] = auth.uid()::text
        AND EXISTS (
          SELECT 1
          FROM public.tier_purchases tp
          JOIN public.tiers t ON t.id = tp.tier_id
          WHERE tp.user_id = auth.uid()
            AND tp.cycle_status = 'active'
            AND t.can_submit_blogs = true
        )
      )
    )
  );

DROP POLICY IF EXISTS "blog_admin_manage" ON storage.objects;
CREATE POLICY "blog_admin_manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'blog-images' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'blog-images' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "course_read_auth" ON storage.objects;
CREATE POLICY "course_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-files'
    AND (
      private.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.courses c
        JOIN public.tier_purchases tp ON tp.user_id = auth.uid()
        JOIN public.tiers t ON t.id = tp.tier_id
        WHERE c.published = true
          AND tp.cycle_status = 'active'
          AND t.course_access_level >= c.required_access_level
          AND c.cover_url = storage.objects.name
      )
      OR EXISTS (
        SELECT 1
        FROM public.course_lessons cl
        JOIN public.courses c ON c.id = cl.course_id
        JOIN public.tier_purchases tp ON tp.user_id = auth.uid()
        JOIN public.tiers t ON t.id = tp.tier_id
        WHERE c.published = true
          AND cl.published = true
          AND tp.cycle_status = 'active'
          AND t.course_access_level >= c.required_access_level
          AND storage.objects.name IN (cl.video_url, cl.attachment_url)
      )
    )
  );

DROP POLICY IF EXISTS "course_admin_all" ON storage.objects;
CREATE POLICY "course_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-files' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'course-files' AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "product_read_auth" ON storage.objects;
CREATE POLICY "product_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'product-files'
    AND (
      private.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.digital_products dp
        JOIN public.tier_purchases tp ON tp.user_id = auth.uid()
        JOIN public.tiers t ON t.id = tp.tier_id
        WHERE dp.published = true
          AND tp.cycle_status = 'active'
          AND t.digital_access_level >= dp.required_access_level
          AND storage.objects.name IN (dp.cover_url, dp.file_url)
      )
    )
  );

DROP POLICY IF EXISTS "product_admin_all" ON storage.objects;
CREATE POLICY "product_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-files' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'product-files' AND private.has_role(auth.uid(), 'admin'));
