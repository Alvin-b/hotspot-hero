
-- Fix overly permissive policies on radcheck
DROP POLICY IF EXISTS "Service can manage radcheck" ON public.radcheck;
DROP POLICY IF EXISTS "Admins can manage radreply" ON public.radreply;
DROP POLICY IF EXISTS "Service can manage radreply" ON public.radreply;

-- radcheck: only admin authenticated users (service role bypasses RLS anyway)
CREATE POLICY "Admins can insert radcheck" ON public.radcheck FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update radcheck" ON public.radcheck FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete radcheck" ON public.radcheck FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can select radcheck" ON public.radcheck FOR SELECT TO authenticated USING (public.is_admin());

-- Fix the ALL policy
DROP POLICY IF EXISTS "Admins can manage radcheck" ON public.radcheck;

-- radreply: same pattern
CREATE POLICY "Admins can insert radreply" ON public.radreply FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update radreply" ON public.radreply FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete radreply" ON public.radreply FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can select radreply" ON public.radreply FOR SELECT TO authenticated USING (public.is_admin());

-- Fix orders: remove permissive policies, service role bypasses RLS
DROP POLICY IF EXISTS "Service can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Service can update orders" ON public.orders;
DROP POLICY IF EXISTS "Service can insert codes" ON public.connection_codes;
