# Mister Pancong Lumer — By Manage Nafa Family

Aplikasi Web Integrated Point of Sale (POS), Manajemen Multicabang, Kasir, Pengeluaran, Laporan Harian (Tutup Kas), Absensi, dan Penggajian (Payroll) Terintegrasi.

Designed Mobile-First for Android & iOS HP screens and Desktop browsers.

---

## 🚀 Stack Teknologi

- **Framework**: Next.js App Router (TypeScript)
- **Styling**: Tailwind CSS (Warna utama Cokelat `#6b3e26`, Krem `#f5e6d3`, Aksen Oranye `#e65100`)
- **Database Utama**: Supabase PostgreSQL (SQL migration & RLS Policies included)
- **Autentikasi**: Supabase Auth (Role-based: Owner, Admin Pusat, Admin Cabang, Penjual)
- **Storage**: Supabase Storage (Gambar produk & nota pengeluaran)
- **Deployment**: Vercel & GitHub

---

## 👑 Hak Akses (4 Role Utama)

1. **OWNER** (Akses Penuh):
   - Kelola seluruh cabang (Cidodol, Blujami, & cabang baru).
   - Kelola pengguna, peran, dan penugasan karyawan.
   - Mengatur menu produk, kategori, harga, dan varian.
   - Melihat & menyetujui laporan harian & pengeluaran.
   - Pengaturan Penggajian (Gaji pokok, transport, uang makan, bonus, & persetujuan payroll).
   - Pengaturan nama & logo usaha dari UI tanpa ubah source code.

2. **ADMIN PUSAT**:
   - Monitoring transaksi, laporan harian, & pengeluaran seluruh cabang.
   - Memeriksa & menyetujui laporan cabang sesuai izin.

3. **ADMIN CABANG**:
   - Kelola operasional cabang yang ditugaskan.
   - Memeriksa penjualan, pengeluaran, & laporan harian cabang bersangkutan.

4. **PENJUAL / KASIR**:
   - Halaman Kasir POS: Pilih produk bergambar, pilih varian/topping, keranjang, kalkulator, bayar (Tunai/QRIS/Transfer), hitung kembalian otomatis, & cetak nota.
   - Riwayat transaksi milik sendiri.
   - Catat pengeluaran operasional cabang.
   - Mulai & selesai shift (Clock In / Clock Out absensi).
   - Kirim Laporan Harian / Tutup Kas pada akhir shift.

---

## 🛠️ Langkah Instalasi & Pengaturan Lokal

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Pengaturan Environment Variables**:
   Salin `.env.example` ke `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Menjalankan Database Migration di Supabase**:
   - Buka SQL Editor di Dashboard Supabase.
   - Jalankan seluruh perintah SQL di file `supabase/schema.sql`.
   - Jalankan data sampel awal di file `supabase/seed.sql`.

4. **Menjalankan Server Pengembangan**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:3000`.

---

## ☁️ Panduan Deployment Produksi (Vercel & Supabase)

1. Push repository ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit Mister Pancong Lumer"
   git push origin main
   ```
2. Hubungkan repository GitHub ke **Vercel**.
3. Masukkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada tab **Environment Variables** di Vercel.
4. Klik **Deploy**.

---

## 🛡️ Keamanan & Integritas Data

- Data disimpan terpusat di Supabase PostgreSQL dengan Row Level Security (RLS).
- Harga pada transaksi disimpan sebagai **snapshot** sehingga perubahan harga produk di masa depan tidak mengubah histori transaksi terdahulu.
- Pembatalan transaksi dan perubahan sensitif mencatat **audit log**.
