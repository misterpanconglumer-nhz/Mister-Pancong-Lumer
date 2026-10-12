-- Database Schema for Mister Pancong Lumer - By Manage Nafa Family
-- Fully compatible with both UUIDs and string identifiers (cat-xxx, prod-xxx, br-xxx)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value) VALUES 
  ('app_name', 'Mister Pancong Lumer'),
  ('brand_owner', 'By Manage Nafa Family'),
  ('logo_url', '/logo.jpg'),
  ('primary_color', '#6b3e26'),
  ('secondary_color', '#f5e6d3'),
  ('accent_color', '#e65100')
ON CONFLICT (key) DO NOTHING;

-- 2. PROFILES (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password TEXT DEFAULT '123',
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin_pusat', 'admin_cabang', 'penjual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial accounts
INSERT INTO public.profiles (id, username, email, password, full_name, role) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'owner', 'owner@panconglumer.com', '123', 'Hj. Nafa (Owner)', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'adminpusat', 'admin.pusat@panconglumer.com', '123', 'Rian (Admin Pusat)', 'admin_pusat'),
  ('33333333-3333-3333-3333-333333333333', 'admincdd', 'admin.cidodol@panconglumer.com', '123', 'Budi (Admin Cidodol)', 'admin_cabang'),
  ('44444444-4444-4444-4444-444444444444', 'kasircdd', 'kasir.cidodol@panconglumer.com', '123', 'Siti Kasir (Penjual Cidodol)', 'penjual'),
  ('55555555-5555-5555-5555-555555555555', 'kasirblj', 'kasir.blujami@panconglumer.com', '123', 'Andi Kasir (Penjual Blujami)', 'penjual')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

-- 3. BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  initial_cash_default NUMERIC(12, 2) DEFAULT 100000.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.branches (id, code, name, address, is_active) VALUES 
  ('br-1', 'CDD', 'Cidodol', 'Jl. Cidodol Raya No. 12, Kebayoran Lama, Jakarta Selatan', TRUE),
  ('br-2', 'BLJ', 'Blujami', 'Jl. Blujami Raya No. 45, Pesanggrahan, Jakarta Selatan', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. EMPLOYEE BRANCH ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.employee_branch_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.categories (id, name, slug, sort_order) VALUES 
  ('cat-1', 'Pancong Lumer', 'pancong-lumer', 1),
  ('cat-2', 'Pancong Crispy', 'pancong-crispy', 2),
  ('cat-3', 'Minuman Segar', 'minuman', 3),
  ('cat-4', 'Topping Ekstra', 'topping', 4)
ON CONFLICT (slug) DO NOTHING;

-- 6. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL,
  variant_type TEXT NOT NULL,
  name TEXT NOT NULL,
  additional_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.expense_categories (name) VALUES 
  ('Bahan Baku'),
  ('Kemasan'),
  ('Es & Bahan Tambahan'),
  ('Transportasi Operasional'),
  ('Perlengkapan'),
  ('Lain-lain')
ON CONFLICT (name) DO NOTHING;

-- 9. SALES (Transactions)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_number TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('tunai', 'qris', 'transfer', 'lainnya')),
  cash_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cash_change NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  cancel_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SALE ITEMS
CREATE TABLE IF NOT EXISTS public.sale_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id TEXT NOT NULL,
  product_id TEXT,
  product_name_snapshot TEXT NOT NULL,
  variant_details_snapshot JSONB DEFAULT '[]'::jsonb,
  unit_price_snapshot NUMERIC(12, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL,
  category_id TEXT,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('kas_cabang', 'uang_pribadi')),
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DAILY REPORTS (Laporan Harian & Tutup Kas)
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL,
  report_date DATE NOT NULL,
  submitted_by TEXT NOT NULL,
  gross_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_transactions INT NOT NULL DEFAULT 0,
  cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  non_cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  branch_cash_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  initial_cash_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  actual_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cash_difference NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision_requested')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, report_date)
);

-- 13. SHIFTS
CREATE TABLE IF NOT EXISTS public.shifts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  shift_id TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir', 'izin', 'sakit', 'libur', 'alpa')),
  notes TEXT,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 15. PAYROLL SETTINGS
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE,
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  base_salary_type TEXT NOT NULL DEFAULT 'monthly',
  transport_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  transport_type TEXT NOT NULL DEFAULT 'per_day',
  meal_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  meal_type TEXT NOT NULL DEFAULT 'per_day',
  custom_components JSONB DEFAULT '[]'::jsonb,
  bonus_rule TEXT,
  sales_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. PAYROLL PERIODS
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. PAYROLL ITEMS
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payroll_period_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  branch_id TEXT,
  days_present INT NOT NULL DEFAULT 0,
  base_salary_calculated NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  transport_calculated NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  meal_calculated NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  custom_components JSONB DEFAULT '[]'::jsonb,
  sales_incentive_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  snapshot_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_period_id, user_id)
);

-- 18. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY & PERMISSIVE POLICIES FOR INSTANT SYNC
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated full access
CREATE POLICY "Allow public full access on app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on product_variants" ON public.product_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on daily_reports" ON public.daily_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on payroll_settings" ON public.payroll_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on payroll_periods" ON public.payroll_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on payroll_items" ON public.payroll_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
