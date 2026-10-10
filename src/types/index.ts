export type UserRole = 'owner' | 'admin_pusat' | 'admin_cabang' | 'penjual';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  initial_cash_default: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeBranchAssignment {
  id: string;
  user_id: string;
  branch_id: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at?: string;
}

export type VariantType = 'rasa' | 'ukuran' | 'topping' | 'ekstra';

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: VariantType | string;
  name: string;
  additional_price: number;
  is_available: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  description?: string;
  image_url?: string;
  base_price: number;
  is_active: boolean;
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface CartVariantSelection {
  variant_id: string;
  variant_type: string;
  name: string;
  additional_price: number;
}

export interface CartItem {
  cart_item_id: string;
  product: Product;
  selected_variants: CartVariantSelection[];
  unit_price: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export type PaymentMethod = 'tunai' | 'qris' | 'transfer' | 'lainnya';

export interface SaleItemSnapshot {
  id?: string;
  sale_id?: string;
  product_id?: string;
  product_name_snapshot: string;
  variant_details_snapshot: CartVariantSelection[];
  unit_price_snapshot: number;
  quantity: number;
  subtotal: number;
}

export interface SaleTransaction {
  id: string;
  transaction_number: string;
  branch_id: string;
  branch_name?: string;
  seller_id: string;
  seller_name?: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  cash_received: number;
  cash_change: number;
  status: 'completed' | 'cancelled';
  cancel_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  created_at: string;
  items?: SaleItemSnapshot[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  branch_id: string;
  branch_name?: string;
  category_id?: string;
  category_name?: string;
  title: string;
  amount: number;
  payment_method: 'kas_cabang' | 'uang_pribadi';
  notes?: string;
  receipt_url?: string;
  created_by: string;
  created_by_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  expense_date: string;
  created_at?: string;
}

export interface DailyReport {
  id: string;
  branch_id: string;
  branch_name?: string;
  report_date: string;
  submitted_by: string;
  submitted_by_name?: string;
  gross_sales: number;
  total_transactions: number;
  cash_sales: number;
  non_cash_sales: number;
  branch_cash_expenses: number;
  initial_cash_balance: number;
  expected_cash: number;
  actual_cash: number;
  cash_difference: number;
  notes?: string;
  status: 'pending' | 'approved' | 'revision_requested';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
}

export interface Shift {
  id: string;
  branch_id?: string;
  name: string;
  start_time: string;
  end_time: string;
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'libur' | 'alpa';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  branch_id: string;
  branch_name?: string;
  shift_id?: string;
  shift_name?: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  status: AttendanceStatus;
  notes?: string;
  verified_by?: string;
  created_at?: string;
}

export interface CustomPayrollComponent {
  id: string;
  name: string; // e.g. "Uang Baju", "Bonus Rajin", "Tunjangan Khusus"
  amount: number;
  type: 'bonus' | 'deduction';
}

export interface PayrollSetting {
  id: string;
  user_id: string;
  user_name?: string;
  base_salary: number;
  base_salary_type: 'monthly' | 'per_day' | 'per_shift';
  transport_allowance: number;
  transport_type: 'monthly' | 'per_day' | 'manual';
  meal_allowance: number;
  meal_type: 'monthly' | 'per_day' | 'manual';
  custom_components?: CustomPayrollComponent[];
  bonus_rule?: string;
  sales_commission_rate: number;
  updated_at?: string;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid';
  created_at?: string;
}

export interface PayrollAdjustment {
  id: string;
  payroll_item_id: string;
  type: 'bonus' | 'deduction' | 'other';
  description: string;
  amount: number;
}

export interface PayrollItem {
  id: string;
  payroll_period_id: string;
  user_id: string;
  user_name?: string;
  branch_id?: string;
  branch_name?: string;
  days_present: number;
  base_salary_calculated: number;
  transport_calculated: number;
  meal_calculated: number;
  bonus_amount: number;
  custom_components?: CustomPayrollComponent[];
  sales_incentive_amount: number;
  total_deductions: number;
  net_salary: number;
  snapshot_data?: any;
  status: 'draft' | 'approved' | 'paid';
  paid_at?: string;
  adjustments?: PayrollAdjustment[];
  created_at?: string;
}

export interface AppIdentitySettings {
  app_name: string;
  brand_owner: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  target_table?: string;
  target_id?: string;
  details?: any;
  created_at: string;
}
