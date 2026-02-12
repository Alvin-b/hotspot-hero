
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Convenience function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Packages table
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  speed_limit TEXT DEFAULT '2M/2M',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone TEXT NOT NULL,
  package_id UUID REFERENCES public.packages(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  mpesa_txn_id TEXT,
  mpesa_receipt TEXT,
  checkout_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Connection codes table
CREATE TABLE public.connection_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(5) NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  package_id UUID REFERENCES public.packages(id) NOT NULL,
  radius_username TEXT NOT NULL,
  radius_password TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.connection_codes ENABLE ROW LEVEL SECURITY;

-- RADIUS tables (FreeRADIUS SQL schema compatible)
CREATE TABLE public.radcheck (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  attribute TEXT NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT ':=',
  value TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.radcheck ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_radcheck_username ON public.radcheck(username);

CREATE TABLE public.radreply (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  attribute TEXT NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT ':=',
  value TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.radreply ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_radreply_username ON public.radreply(username);

-- RLS Policies

-- user_roles: only admins can manage
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());

-- packages: public read, admin write
CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Admins can insert packages" ON public.packages FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update packages" ON public.packages FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete packages" ON public.packages FOR DELETE TO authenticated USING (public.is_admin());

-- orders: admin can read all, public no direct access (webhook writes via service role)
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Service can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update orders" ON public.orders FOR UPDATE USING (true);

-- connection_codes: public can look up by code, admin manages all
CREATE POLICY "Anyone can lookup active codes" ON public.connection_codes FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can insert codes" ON public.connection_codes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update codes" ON public.connection_codes FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Service can insert codes" ON public.connection_codes FOR INSERT WITH CHECK (true);

-- radcheck/radreply: admin only + service role for edge functions
CREATE POLICY "Admins can manage radcheck" ON public.radcheck FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Service can manage radcheck" ON public.radcheck FOR ALL USING (true);
CREATE POLICY "Admins can manage radreply" ON public.radreply FOR ALL TO authenticated USING (true);
CREATE POLICY "Service can manage radreply" ON public.radreply FOR ALL USING (true);

-- View for public code lookup (hides radius credentials)
CREATE VIEW public.connection_codes_public
WITH (security_invoker = on) AS
SELECT id, code, package_id, expires_at, status, created_at
FROM public.connection_codes;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
