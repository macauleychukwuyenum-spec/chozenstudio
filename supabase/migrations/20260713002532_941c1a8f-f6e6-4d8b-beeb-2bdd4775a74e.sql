
-- AVATARS
CREATE POLICY "avatars_read_all" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- BLOG IMAGES
CREATE POLICY "blog_read_all" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'blog-images');
CREATE POLICY "blog_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images');
CREATE POLICY "blog_admin_manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- COURSE FILES (admin only write; auth read)
CREATE POLICY "course_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-files');
CREATE POLICY "course_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'admin'));

-- PRODUCT FILES (admin only write; auth read)
CREATE POLICY "product_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-files');
CREATE POLICY "product_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'));

-- Add avatar_url to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
