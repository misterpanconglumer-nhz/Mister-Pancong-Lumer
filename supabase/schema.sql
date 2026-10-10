-- Database Schema for Mister Pancong Lumer - By Manage Nafa Family
-- Enable UUID extension
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
  ('logo_url', '/logo-placeholder.png'),
  ('primary_color', '#6b3e26'),
  ('secondary_color', '#f5e6d3'),
  ('accent_color', '#e65100')
ON CONFLICT (key) DO NOTHING;

-- 2. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin_pusat', 'admin_cabang', 'penjual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  initial_cash_default NUMERIC(12, 2) DEFAULT 100000.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Branches
INSERT INTO public.branches (code, name, address, is_active) VALUES 
  ('CDD', 'Cidodol', 'Jl. Cidodol Raya No. 12, Jakarta Selatan', TRUE),
  ('BLJ', 'Blujami', 'Jl. Blujami Raya No. 45, Jakarta Selatan', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. EMPLOYEE BRANCH ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.employee_branch_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.categories (name, slug, sort_order) VALUES 
  ('Pancong', 'pancong', 1),
  ('Minuman', 'minuman', 2),
  ('Topping & Ekstra', 'topping-ekstra', 3)
ON CONFLICT (slug) DO NOTHING;

-- 6. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,
  name TEXT NOT NULL,
  additional_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number TEXT UNIQUE NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('tunai', 'qris', 'transfer', 'lainnya')),
  cash_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cash_change NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  cancel_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SALE ITEMS
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name_snapshot TEXT NOT NULL,
  variant_details_snapshot JSONB DEFAULT '[]'::jsonb,
  unit_price_snapshot NUMERIC(12, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  category_id UUID REFERENCES public.expense_categories(id),
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('kas_cabang', 'uang_pribadi')),
  notes TEXT,
  receipt_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DAILY REPORTS (Tutup Kas / Laporan Harian)
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  report_date DATE NOT NULL,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
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
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, report_date)
);

-- 13. SHIFTS
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  shift_id UUID REFERENCES public.shifts(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir', 'izin', 'sakit', 'libur', 'alpa')),
  notes TEXT,
  verified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 15. PAYROLL SETTINGS
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. PAYROLL ITEMS
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID REFERENCES public.branches(id),
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

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
