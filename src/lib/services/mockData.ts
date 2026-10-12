import {
  UserProfile,
  Branch,
  Category,
  Product,
  SaleTransaction,
  Expense,
  DailyReport,
  AttendanceRecord,
  PayrollSetting,
  PayrollPeriod,
  PayrollItem,
  AppIdentitySettings,
  AuditLog,
} from '@/types';

export const INITIAL_APP_SETTINGS: AppIdentitySettings = {
  app_name: 'Mister Pancong Lumer',
  brand_owner: 'By Manage Nafa Family',
  logo_url: '/logo.jpg',
  primary_color: '#6b3e26',
  secondary_color: '#f5e6d3',
  accent_color: '#e65100',
};

export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'br-1',
    code: 'CDD',
    name: 'Cidodol',
    address: 'Jl. Cidodol Raya No. 12, Kebayoran Lama, Jakarta Selatan',
    phone: '081234567890',
    is_active: true,
    initial_cash_default: 100000,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'br-2',
    code: 'BLJ',
    name: 'Blujami',
    address: 'Jl. Blujami Raya No. 45, Pesanggrahan, Jakarta Selatan',
    phone: '081987654321',
    is_active: true,
    initial_cash_default: 100000,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
];

export const MOCK_USERS: UserProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'owner',
    email: 'owner@panconglumer.com',
    password: '123',
    full_name: 'Hj. Nafa (Owner)',
    phone: '08111111111',
    role: 'owner',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'adminpusat',
    email: 'admin.pusat@panconglumer.com',
    password: '123',
    full_name: 'Rian (Admin Pusat)',
    phone: '08222222222',
    role: 'admin_pusat',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'admincdd',
    email: 'admin.cidodol@panconglumer.com',
    password: '123',
    full_name: 'Budi (Admin Cidodol)',
    phone: '08333333333',
    role: 'admin_cabang',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'kasircdd',
    email: 'kasir.cidodol@panconglumer.com',
    password: '123',
    full_name: 'Siti Kasir (Penjual Cidodol)',
    phone: '08444444444',
    role: 'penjual',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'kasirblj',
    email: 'kasir.blujami@panconglumer.com',
    password: '123',
    full_name: 'Andi Kasir (Penjual Blujami)',
    phone: '08555555555',
    role: 'penjual',
  },
];

export const MOCK_EMPLOYEE_ASSIGNMENTS = [
  { id: 'ea-1', user_id: 'usr-seller-cdd', branch_id: 'br-1' },
  { id: 'ea-2', user_id: 'usr-admin-cdd', branch_id: 'br-1' },
  { id: 'ea-3', user_id: 'usr-seller-blj', branch_id: 'br-2' },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Pancong Lumer', slug: 'pancong-lumer', sort_order: 1 },
  { id: 'cat-2', name: 'Pancong Crispy', slug: 'pancong-crispy', sort_order: 2 },
  { id: 'cat-3', name: 'Minuman Segar', slug: 'minuman', sort_order: 3 },
  { id: 'cat-4', name: 'Topping Ekstra', slug: 'topping', sort_order: 4 },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    category_id: 'cat-1',
    category_name: 'Pancong Lumer',
    name: 'Pancong Lumer Signature',
    description: 'Pancong khas adonan khusus, pilihan lumer setengah matang atau matang sempurna.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 12000,
    is_active: true,
    variants: [
      { id: 'v-1-1', product_id: 'prod-1', variant_type: 'rasa', name: 'Cokelat Lumer', additional_price: 3000, is_available: true },
      { id: 'v-1-2', product_id: 'prod-1', variant_type: 'rasa', name: 'Keju Cheddar Parut', additional_price: 3000, is_available: true },
      { id: 'v-1-3', product_id: 'prod-1', variant_type: 'rasa', name: 'Tiramisu Smooth', additional_price: 4000, is_available: true },
      { id: 'v-1-4', product_id: 'prod-1', variant_type: 'rasa', name: 'Matcha Kyoto', additional_price: 4000, is_available: true },
      { id: 'v-1-5', product_id: 'prod-1', variant_type: 'rasa', name: 'Original Gula Halus', additional_price: 0, is_available: true },
      { id: 'v-1-6', product_id: 'prod-1', variant_type: 'tingkat_kematangan', name: 'Lumer 1/2 Matang (Lumer Melt)', additional_price: 0, is_available: true },
      { id: 'v-1-7', product_id: 'prod-1', variant_type: 'tingkat_kematangan', name: 'Matang Sempurna', additional_price: 0, is_available: true },
    ],
  },
  {
    id: 'prod-2',
    category_id: 'cat-2',
    category_name: 'Pancong Crispy',
    name: 'Pancong Crispy Crunch',
    description: 'Tekstur renyah garing di pinggir, lembut kenyal di tengah.',
    image_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80',
    base_price: 13000,
    is_active: true,
    variants: [
      { id: 'v-2-1', product_id: 'prod-2', variant_type: 'rasa', name: 'Cokelat Keju Melt', additional_price: 4000, is_available: true },
      { id: 'v-2-2', product_id: 'prod-2', variant_type: 'rasa', name: 'Red Velvet Cheese', additional_price: 4000, is_available: true },
      { id: 'v-2-3', product_id: 'prod-2', variant_type: 'rasa', name: 'Taro Milky', additional_price: 4000, is_available: true },
    ],
  },
  {
    id: 'prod-3',
    category_id: 'cat-3',
    category_name: 'Minuman Segar',
    name: 'Es Teh Manis Pancong',
    description: 'Es teh melati segar manis pas.',
    image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80',
    base_price: 5000,
    is_active: true,
    variants: [
      { id: 'v-3-1', product_id: 'prod-3', variant_type: 'ukuran', name: 'Cup Regular (16oz)', additional_price: 0, is_available: true },
      { id: 'v-3-2', product_id: 'prod-3', variant_type: 'ukuran', name: 'Cup Jumbo (22oz)', additional_price: 3000, is_available: true },
    ],
  },
  {
    id: 'prod-4',
    category_id: 'cat-3',
    category_name: 'Minuman Segar',
    name: 'Es Kopi Susu Lumer',
    description: 'Kopi susu gula aren creamy penyegar dahaga.',
    image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=500&q=80',
    base_price: 12000,
    is_active: true,
    variants: [
      { id: 'v-4-1', product_id: 'prod-4', variant_type: 'manis', name: 'Normal Sugar', additional_price: 0, is_available: true },
      { id: 'v-4-2', product_id: 'prod-4', variant_type: 'manis', name: 'Less Sugar 50%', additional_price: 0, is_available: true },
    ],
  },
];

export const MOCK_SALES: SaleTransaction[] = [];

export const MOCK_EXPENSES: Expense[] = [];

export const MOCK_DAILY_REPORTS: DailyReport[] = [];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [];

export const MOCK_PAYROLL_SETTINGS: PayrollSetting[] = [
  {
    id: 'ps-1',
    user_id: '44444444-4444-4444-4444-444444444444',
    user_name: 'Siti Kasir (Penjual Cidodol)',
    base_salary: 1500000,
    base_salary_type: 'monthly',
    transport_allowance: 25000,
    transport_type: 'per_day',
    meal_allowance: 25000,
    meal_type: 'per_day',
    custom_components: [
      { id: 'cc-1', name: 'Uang Seragam Baju', amount: 100000, type: 'bonus' },
      { id: 'cc-2', name: 'Bonus Kedisiplinan', amount: 150000, type: 'bonus' },
    ],
    bonus_rule: 'Bonus target omzet > Rp 10 Juta / bulan',
    sales_commission_rate: 1.5,
  },
  {
    id: 'ps-2',
    user_id: '55555555-5555-5555-5555-555555555555',
    user_name: 'Andi Kasir (Penjual Blujami)',
    base_salary: 1500000,
    base_salary_type: 'monthly',
    transport_allowance: 25000,
    transport_type: 'per_day',
    meal_allowance: 25000,
    meal_type: 'per_day',
    custom_components: [
      { id: 'cc-3', name: 'Uang Baju Seragam', amount: 100000, type: 'bonus' },
    ],
    bonus_rule: 'Bonus target omzet',
    sales_commission_rate: 1.5,
  },
];

export const MOCK_PAYROLL_PERIODS: PayrollPeriod[] = [];

export const MOCK_PAYROLL_ITEMS: PayrollItem[] = [];

export const MOCK_AUDIT_LOGS: AuditLog[] = [];

