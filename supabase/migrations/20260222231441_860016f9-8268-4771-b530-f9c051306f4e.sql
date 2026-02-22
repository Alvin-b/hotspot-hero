
-- Fix user_roles policies to PERMISSIVE
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (is_admin());

-- Fix packages policies to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can insert packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can update packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can delete packages" ON public.packages;

CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Admins can insert packages" ON public.packages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update packages" ON public.packages FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete packages" ON public.packages FOR DELETE USING (is_admin());

-- Fix orders policies to PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (is_admin());

-- Fix connection_codes policies to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can lookup active codes" ON public.connection_codes;
DROP POLICY IF EXISTS "Admins can insert codes" ON public.connection_codes;
DROP POLICY IF EXISTS "Admins can update codes" ON public.connection_codes;
DROP POLICY IF EXISTS "Admins can view all codes" ON public.connection_codes;

CREATE POLICY "Anyone can lookup active codes" ON public.connection_codes FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can insert codes" ON public.connection_codes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update codes" ON public.connection_codes FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can view all codes" ON public.connection_codes FOR SELECT USING (is_admin());

-- Fix radcheck policies to PERMISSIVE
DROP POLICY IF EXISTS "Admins can select radcheck" ON public.radcheck;
DROP POLICY IF EXISTS "Admins can insert radcheck" ON public.radcheck;
DROP POLICY IF EXISTS "Admins can update radcheck" ON public.radcheck;
DROP POLICY IF EXISTS "Admins can delete radcheck" ON public.radcheck;

CREATE POLICY "Admins can select radcheck" ON public.radcheck FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert radcheck" ON public.radcheck FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update radcheck" ON public.radcheck FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete radcheck" ON public.radcheck FOR DELETE USING (is_admin());

-- Fix radreply policies to PERMISSIVE
DROP POLICY IF EXISTS "Admins can select radreply" ON public.radreply;
DROP POLICY IF EXISTS "Admins can insert radreply" ON public.radreply;
DROP POLICY IF EXISTS "Admins can update radreply" ON public.radreply;
DROP POLICY IF EXISTS "Admins can delete radreply" ON public.radreply;

CREATE POLICY "Admins can select radreply" ON public.radreply FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert radreply" ON public.radreply FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update radreply" ON public.radreply FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete radreply" ON public.radreply FOR DELETE USING (is_admin());
