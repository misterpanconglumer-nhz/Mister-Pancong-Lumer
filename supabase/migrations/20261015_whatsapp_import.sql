-- ==============================================================================
-- MIGRATION: EXTENDED FIELDS FOR WHATSAPP SALES & EXPENSE REPORT IMPORTS
-- Project: Mister Pancong Lumer (Manage Nafa Family)
-- Date: 2026-10-15
-- ==============================================================================

-- 1. Tambahkan kolom pendukung WhatsApp Import pada tabel daily_reports
ALTER TABLE public.daily_reports 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS raw_text TEXT,
  ADD COLUMN IF NOT EXISTS dough_ordered TEXT,
  ADD COLUMN IF NOT EXISTS portions_sold TEXT,
  ADD COLUMN IF NOT EXISTS dough_leftover TEXT,
  ADD COLUMN IF NOT EXISTS transfer_sales NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS qris_sales NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_revision BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revision_by TEXT,
  ADD COLUMN IF NOT EXISTS original_omzet NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS revision_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- 2. Buat index performa untuk pencarian laporan berdasarkan cabang & tanggal
CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_date ON public.daily_reports(branch_id, report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_source ON public.daily_reports(source);

-- 3. Pastikan constraint UNIQUE per cabang & tanggal aktif (mencegah duplikasi data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_reports_branch_id_report_date_key'
  ) THEN
    ALTER TABLE public.daily_reports ADD CONSTRAINT daily_reports_branch_id_report_date_key UNIQUE (branch_id, report_date);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;
