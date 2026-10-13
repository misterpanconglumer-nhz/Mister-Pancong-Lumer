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
    id: 'd9ec11ac-c42f-4904-b932-20abbe83e89e',
    code: 'CDD',
    name: 'Cidodol',
    address: 'Jl. Cidodol Raya No. 12, Kebayoran Lama, Jakarta Selatan',
    phone: '',
    is_active: true,
    initial_cash_default: 100000,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: '44cf6cab-4158-4bb3-8bea-9a39fef97adc',
    code: 'ULJ',
    name: 'Ulujami',
    address: 'Jl. Ulujami Raya No. 45, Pesanggrahan, Jakarta Selatan',
    phone: '',
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
    full_name: 'Nasrullah (Owner)',
    phone: '',
    role: 'owner',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'adminpusat',
    email: 'admin.pusat@panconglumer.com',
    password: '123',
    full_name: 'Rian (Admin Pusat)',
    phone: '',
    role: 'admin_pusat',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'cidodol',
    email: 'admin.cidodol@panconglumer.com',
    password: '123',
    full_name: 'Next Karyawan',
    phone: '',
    role: 'penjual',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'kasircdd',
    email: 'kasir.cidodol@panconglumer.com',
    password: '123',
    full_name: 'Siti Kasir (Penjual Cidodol)',
    phone: '',
    role: 'penjual',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'ulujami',
    email: 'kasir.blujami@panconglumer.com',
    password: '123',
    full_name: 'Muhammad Naufal Irawan',
    phone: '',
    role: 'penjual',
  },
];

export const MOCK_EMPLOYEE_ASSIGNMENTS = [
  { id: 'ea-1', user_id: 'usr-seller-cdd', branch_id: 'br-1' },
  { id: 'ea-2', user_id: 'usr-admin-cdd', branch_id: 'br-1' },
  { id: 'ea-3', user_id: 'usr-seller-blj', branch_id: 'br-2' },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Coklat Lumer', slug: 'coklat-lumer', sort_order: 1 },
  { id: 'cat-2', name: 'Varian Crunch', slug: 'varian-crunch', sort_order: 2 },
  { id: 'cat-3', name: 'Minuman Segar', slug: 'minuman-segar', sort_order: 3 },
];

const standardPancongVariants = (productId: string) => [
  { id: `${productId}-v1`, product_id: productId, variant_type: 'tingkat_kematangan', name: 'Lumer (1/2 Matang)', additional_price: 0, is_available: true },
  { id: `${productId}-v2`, product_id: productId, variant_type: 'tingkat_kematangan', name: 'Matang Sempurna', additional_price: 0, is_available: true },
  { id: `${productId}-v3`, product_id: productId, variant_type: 'topping', name: 'Ekstra Keju Parut', additional_price: 2000, is_available: true },
  { id: `${productId}-v4`, product_id: productId, variant_type: 'topping', name: 'Ekstra Oreo Crumb', additional_price: 2500, is_available: true },
  { id: `${productId}-v5`, product_id: productId, variant_type: 'topping', name: 'Ekstra Choco Chip', additional_price: 2000, is_available: true },
];

export const MOCK_PRODUCTS: Product[] = [
  // 1. Kategori Coklat Lumer
  {
    id: 'prod-cl-1',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Coklat Susu',
    description: 'Pancong lumer dengan saus coklat manis legit dan kental manis.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 12000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-1'),
  },
  {
    id: 'prod-cl-2',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Coklat Keju',
    description: 'Perpaduan klasik coklat lumer dipadu parutan keju gurih.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 14000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-2'),
  },
  {
    id: 'prod-cl-3',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Keju Susu',
    description: 'Pancong lumer dengan limpahan keju cheddar parut dan susu kental manis.',
    image_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80',
    base_price: 14000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-3'),
  },
  {
    id: 'prod-cl-4',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Coklat Kacang Susu',
    description: 'Kombinasi saus coklat lumer, taburan kacang sangrai gurih renyah, dan susu manis.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 14000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-4'),
  },
  {
    id: 'prod-cl-5',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Coklat Keju Susu',
    description: '⭐ BEST SELLER! Coklat lumer kaya rasa, taburan keju gurih melimpah, dan susu kental manis.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 15000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-5'),
  },
  {
    id: 'prod-cl-6',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Double Keju Susu',
    description: '⭐ BEST SELLER! Ekstra keju melimpah di luar dan dalam adonan lumer super gurih!',
    image_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80',
    base_price: 15000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-6'),
  },
  {
    id: 'prod-cl-7',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Coklat Oreo Susu',
    description: 'Coklat lumer berpadu biskuit Oreo crumble crunchy dan susu kental manis.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 17000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-7'),
  },
  {
    id: 'prod-cl-8',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Coklat Milo Susu',
    description: 'Sensasi coklat lumer bertabur bubuk coklat malt Milo premium harum legit.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 16000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-8'),
  },
  {
    id: 'prod-cl-9',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Coklat Pisang Susu',
    description: 'Potongan pisang berpadu lelehan coklat lumer hangat dan kucuran susu manis.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 17000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-9'),
  },
  {
    id: 'prod-cl-10',
    category_id: 'cat-1',
    category_name: 'Coklat Lumer',
    name: 'Keju Pisang Susu',
    description: 'Potongan pisang berpadu gurihnya keju parut dan kucuran susu lezat.',
    image_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80',
    base_price: 14000,
    is_active: true,
    variants: standardPancongVariants('prod-cl-10'),
  },

  // 2. Kategori Varian Crunch
  {
    id: 'prod-cr-1',
    category_id: 'cat-2',
    category_name: 'Varian Crunch',
    name: 'Taro Susu',
    description: 'Pancong lumer dengan saus talas taro ungu khas yang creamy harum dan legit.',
    image_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80',
    base_price: 15000,
    is_active: true,
    variants: standardPancongVariants('prod-cr-1'),
  },
  {
    id: 'prod-cr-2',
    category_id: 'cat-2',
    category_name: 'Varian Crunch',
    name: 'Coklat Crunchy',
    description: 'Saus coklat crunchy dengan sensasi butiran krispi kriuk renyah di tiap gigitan.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 18000,
    is_active: true,
    variants: standardPancongVariants('prod-cr-2'),
  },
  {
    id: 'prod-cr-3',
    category_id: 'cat-2',
    category_name: 'Varian Crunch',
    name: 'Green Tea Crunchy',
    description: 'Matcha green tea harum aromatik berpadu sensasi butiran crunchy garing renyah.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 19000,
    is_active: true,
    variants: standardPancongVariants('prod-cr-3'),
  },
  {
    id: 'prod-cr-4',
    category_id: 'cat-2',
    category_name: 'Varian Crunch',
    name: 'Tiramisu Crunchy',
    description: 'Kelezatan tiramisu khas Italia dengan sensasi renyah krispi crunchy mewah.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 19000,
    is_active: true,
    variants: standardPancongVariants('prod-cr-4'),
  },
  {
    id: 'prod-cr-5',
    category_id: 'cat-2',
    category_name: 'Varian Crunch',
    name: 'Cheese Crunchy',
    description: 'Saus keju gurih creamy dengan butiran keju crunchy yang garing dan nagih.',
    image_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80',
    base_price: 19000,
    is_active: true,
    variants: standardPancongVariants('prod-cr-5'),
  },
  {
    id: 'prod-cr-6',
    category_id: 'cat-2',
    category_name: 'Varian Crunch',
    name: 'Spesial Mix',
    description: '⭐ BEST SELLER! Kombinasi spesial aneka rasa favorit pilihan Mister Pancong Lumer.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    base_price: 20000,
    is_active: true,
    variants: standardPancongVariants('prod-cr-6'),
  },

  // 3. Kategori Minuman Segar
  {
    id: 'prod-dr-1',
    category_id: 'cat-3',
    category_name: 'Minuman Segar',
    name: 'Es Teh Manis Segar',
    description: 'Es teh melati segar manis pas penyegar setelah menikmati pancong lumer.',
    image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80',
    base_price: 5000,
    is_active: true,
    variants: [
      { id: 'prod-dr-1-v1', product_id: 'prod-dr-1', variant_type: 'ukuran', name: 'Cup Regular', additional_price: 0, is_available: true },
      { id: 'prod-dr-1-v2', product_id: 'prod-dr-1', variant_type: 'ukuran', name: 'Cup Jumbo 22oz', additional_price: 3000, is_available: true },
    ],
  },
  {
    id: 'prod-dr-2',
    category_id: 'cat-3',
    category_name: 'Minuman Segar',
    name: 'Air Mineral Dingin',
    description: 'Air mineral botol dingin menyegarkan.',
    image_url: 'https://images.unsplash.com/photo-1559839914-ba2ae140c6b7?auto=format&fit=crop&w=500&q=80',
    base_price: 4000,
    is_active: true,
    variants: [],
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

