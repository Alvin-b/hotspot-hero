
-- Fix packages policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can insert packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can update packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can delete packages" ON public.packages;

CREATE POLICY "Anyone can view active packages" ON public.packages AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Admins can insert packages" ON public.packages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update packages" ON public.packages AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete packages" ON public.packages AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

-- Fix orders policies
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());

-- Fix connection_codes policies
DROP POLICY IF EXISTS "Anyone can lookup active codes" ON public.connection_codes;
DROP POLICY IF EXISTS "Admins can insert codes" ON public.connection_codes;
DROP POLICY IF EXISTS "Admins can update codes" ON public.connection_codes;

CREATE POLICY "Anyone can lookup active codes" ON public.connection_codes AS PERMISSIVE FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can insert codes" ON public.connection_codes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update codes" ON public.connection_codes AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all codes" ON public.connection_codes AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());

-- Fix user_roles policies
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

-- Fix radcheck policies
DROP POLICY IF EXISTS "Admins can insert radcheck" ON public.radcheck;
DROP POLICY IF EXISTS "Admins can update radcheck" ON public.radcheck;
DROP POLICY IF EXISTS "Admins can delete radcheck" ON public.radcheck;
DROP POLICY IF EXISTS "Admins can select radcheck" ON public.radcheck;

CREATE POLICY "Admins can select radcheck" ON public.radcheck AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert radcheck" ON public.radcheck AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update radcheck" ON public.radcheck AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete radcheck" ON public.radcheck AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

-- Fix radreply policies
DROP POLICY IF EXISTS "Admins can insert radreply" ON public.radreply;
DROP POLICY IF EXISTS "Admins can update radreply" ON public.radreply;
DROP POLICY IF EXISTS "Admins can delete radreply" ON public.radreply;
DROP POLICY IF EXISTS "Admins can select radreply" ON public.radreply;

CREATE POLICY "Admins can select radreply" ON public.radreply AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert radreply" ON public.radreply AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update radreply" ON public.radreply AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete radreply" ON public.radreply AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());
