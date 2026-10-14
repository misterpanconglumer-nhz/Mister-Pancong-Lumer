import * as XLSX from 'xlsx';
import { WhatsAppReportItem, WhatsAppExpenseItem, Branch } from '@/types';

export interface ParsedExcelResult {
  fileName: string;
  sheetNames: string[];
  laporanUtama: WhatsAppReportItem[];
  revisiNasrullah: WhatsAppReportItem[];
  rincianPengeluaran: WhatsAppExpenseItem[];
  semuaLaporan: WhatsAppReportItem[];
  detectedBranchHint?: string; // e.g. 'Ulujami'
  summary: {
    totalUtama: number;
    totalRevisi: number;
    totalPengeluaran: number;
    totalSemua: number;
    duplicateCount: number;
    unverifiedCount: number;
    verifiedOmzet: number;
    unverifiedOmzet: number;
    totalPengeluaranRp: number;
    dateRange: { start: string; end: string };
  };
  duplicatesList: Array<{ date: string; items: WhatsAppReportItem[] }>;
}

export interface ImportOptions {
  reports: WhatsAppReportItem[];
  expenses: WhatsAppExpenseItem[];
  targetBranch: Branch;
  userId: string;
  userName?: string;
  applyRevisions?: boolean;
  skipDuplicates?: boolean;
  importExpenses?: boolean;
  createSalesTransactions?: boolean;
  onProgress?: (percentage: number, stepText: string) => void;
}

export interface ImportResult {
  success: boolean;
  importedReportsCount: number;
  appliedRevisionsCount: number;
  importedExpensesCount: number;
  importedSalesCount: number;
  skippedDuplicatesCount: number;
  errorMessage?: string;
}

// Helper: Normalize date string to YYYY-MM-DD
function normalizeDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // Check DD/MM/YY or DD/MM/YYYY
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // If Excel serial number date
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  return String(val);
}

// Helper: Clean currency or number value
function parseNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// Helper: Clean text from hidden unicode chars
function cleanText(val: any): string {
  if (!val) return '';
  return String(val)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    .trim();
}

export const ExcelImportService = {
  /**
   * Reads and parses an uploaded .xlsx file containing WhatsApp sales and expense reports
   */
  async parseExcelFile(file: File): Promise<ParsedExcelResult> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetNames = wb.SheetNames;

    // Locate sheets with case-insensitive matching
    const findSheet = (target: string) => {
      const match = sheetNames.find(
        (s) => s.trim().toLowerCase() === target.trim().toLowerCase()
      );
      return match ? wb.Sheets[match] : null;
    };

    const utamaSheet = findSheet('Laporan_Utama');
    const revisiSheet = findSheet('Revisi_Nasrullah');
    const pengeluaranSheet = findSheet('Rincian_Pengeluaran');
    const semuaSheet = findSheet('Semua_Laporan_2025+');

    if (!utamaSheet && !semuaSheet) {
      throw new Error(
        'Format file Excel tidak sesuai. Sheet "Laporan_Utama" atau "Semua_Laporan_2025+" tidak ditemukan.'
      );
    }

    // 1. Parse Laporan_Utama
    const rawUtama: any[] = utamaSheet ? XLSX.utils.sheet_to_json(utamaSheet) : [];
    const laporanUtama: WhatsAppReportItem[] = rawUtama.map((r, idx) => ({
      id: `ut-${idx}-${Date.now()}`,
      tanggal_laporan: normalizeDate(r.Tanggal_Laporan || r.tanggal_laporan),
      tanggal_chat: cleanText(r.Tanggal_Chat || r.tanggal_chat),
      waktu_chat: cleanText(r.Waktu_Chat || r.waktu_chat),
      pengirim: cleanText(r.Pengirim || r.pengirim || 'Kasir'),
      peran_pesan: cleanText(r.Peran_Pesan || r.peran_pesan),
      pemesanan_adonan: cleanText(r.Pemesanan_Adonan || r.pemesanan_adonan),
      terjual_teks: cleanText(r.Terjual_Teks || r.terjual_teks),
      sisa_adonan: cleanText(r.Sisa_Adonan || r.sisa_adonan),
      omzet_rp: parseNumber(r.Omzet_Rp || r.omzet_rp),
      pengeluaran_total_rp: parseNumber(r.Pengeluaran_Total_Rp || r.pengeluaran_total_rp),
      masuk_qr_rp: parseNumber(r.Masuk_QR_Rp || r.masuk_qr_rp),
      masuk_tf_rp: parseNumber(r.Masuk_TF_Rp || r.masuk_tf_rp),
      saldo_cash_rp: parseNumber(r.Saldo_Cash_Rp || r.saldo_cash_rp),
      status_verifikasi: cleanText(r.Status_Verifikasi || r.status_verifikasi || 'Perlu verifikasi'),
      isi_laporan_lengkap: cleanText(r.Isi_Laporan_Lengkap || r.isi_laporan_lengkap),
      selected_for_import: true,
    }));

    // 2. Parse Revisi_Nasrullah
    const rawRevisi: any[] = revisiSheet ? XLSX.utils.sheet_to_json(revisiSheet) : [];
    const revisiNasrullah: WhatsAppReportItem[] = rawRevisi.map((r, idx) => ({
      id: `rev-${idx}-${Date.now()}`,
      tanggal_laporan: normalizeDate(r.Tanggal_Laporan || r.tanggal_laporan),
      tanggal_chat: cleanText(r.Tanggal_Chat || r.tanggal_chat),
      waktu_chat: cleanText(r.Waktu_Chat || r.waktu_chat),
      pengirim: cleanText(r.Pengirim || r.pengirim || 'Nasrullah Jamaluddin'),
      peran_pesan: cleanText(r.Peran_Pesan || r.peran_pesan || 'REVISI/KOREKSI'),
      pemesanan_adonan: cleanText(r.Pemesanan_Adonan || r.pemesanan_adonan),
      terjual_teks: cleanText(r.Terjual_Teks || r.terjual_teks),
      sisa_adonan: cleanText(r.Sisa_Adonan || r.sisa_adonan),
      omzet_rp: parseNumber(r.Omzet_Rp || r.omzet_rp),
      pengeluaran_total_rp: parseNumber(r.Pengeluaran_Total_Rp || r.pengeluaran_total_rp),
      masuk_qr_rp: parseNumber(r.Masuk_QR_Rp || r.masuk_qr_rp),
      masuk_tf_rp: parseNumber(r.Masuk_TF_Rp || r.masuk_tf_rp),
      saldo_cash_rp: parseNumber(r.Saldo_Cash_Rp || r.saldo_cash_rp),
      status_verifikasi: cleanText(r.Status_Verifikasi || r.status_verifikasi || 'Revisi Nasrullah'),
      isi_laporan_lengkap: cleanText(r.Isi_Laporan_Lengkap || r.isi_laporan_lengkap),
      is_revision: true,
      revision_by: cleanText(r.Pengirim || 'Nasrullah Jamaluddin'),
      selected_for_import: true,
    }));

    // 3. Parse Rincian_Pengeluaran
    const rawExp: any[] = pengeluaranSheet ? XLSX.utils.sheet_to_json(pengeluaranSheet) : [];
    const rincianPengeluaran: WhatsAppExpenseItem[] = rawExp.map((r) => {
      const rincian = cleanText(r.Rincian || r.rincian);
      let catName = 'Bahan Baku';
      const rLower = rincian.toLowerCase();
      if (rLower.includes('ongkir') || rLower.includes('transport') || rLower.includes('bensin')) {
        catName = 'Transportasi Operasional';
      } else if (rLower.includes('keamanan') || rLower.includes('kebersihan') || rLower.includes('lapak') || rLower.includes('yatim')) {
        catName = 'Lain-lain';
      } else if (rLower.includes('gas') || rLower.includes('es ') || rLower.includes('es batu')) {
        catName = 'Es & Bahan Tambahan';
      } else if (rLower.includes('kemasan') || rLower.includes('plastik') || rLower.includes('cup') || rLower.includes('kresek')) {
        catName = 'Kemasan';
      }

      return {
        tanggal_laporan: normalizeDate(r.Tanggal_Laporan || r.tanggal_laporan),
        tanggal_chat: cleanText(r.Tanggal_Chat || r.tanggal_chat),
        pengirim: cleanText(r.Pengirim || r.pengirim),
        peran_pesan: cleanText(r.Peran_Pesan || r.peran_pesan),
        rincian,
        nominal_rp: parseNumber(r.Nominal_Rp || r.nominal_rp),
        status_verifikasi: cleanText(r.Status_Verifikasi || r.status_verifikasi),
        category_name: catName,
      };
    });

    // 4. Parse Semua_Laporan_2025+
    const rawSemua: any[] = semuaSheet ? XLSX.utils.sheet_to_json(semuaSheet) : [];
    const semuaLaporan: WhatsAppReportItem[] = rawSemua.map((r, idx) => ({
      id: `all-${idx}-${Date.now()}`,
      tanggal_laporan: normalizeDate(r.Tanggal_Laporan || r.tanggal_laporan),
      tanggal_chat: cleanText(r.Tanggal_Chat || r.tanggal_chat),
      waktu_chat: cleanText(r.Waktu_Chat || r.waktu_chat),
      pengirim: cleanText(r.Pengirim || r.pengirim),
      peran_pesan: cleanText(r.Peran_Pesan || r.peran_pesan),
      pemesanan_adonan: cleanText(r.Pemesanan_Adonan || r.pemesanan_adonan),
      terjual_teks: cleanText(r.Terjual_Teks || r.terjual_teks),
      sisa_adonan: cleanText(r.Sisa_Adonan || r.sisa_adonan),
      omzet_rp: parseNumber(r.Omzet_Rp || r.omzet_rp),
      pengeluaran_total_rp: parseNumber(r.Pengeluaran_Total_Rp || r.pengeluaran_total_rp),
      masuk_qr_rp: parseNumber(r.Masuk_QR_Rp || r.masuk_qr_rp),
      masuk_tf_rp: parseNumber(r.Masuk_TF_Rp || r.masuk_tf_rp),
      saldo_cash_rp: parseNumber(r.Saldo_Cash_Rp || r.saldo_cash_rp),
      status_verifikasi: cleanText(r.Status_Verifikasi || r.status_verifikasi),
      isi_laporan_lengkap: cleanText(r.Isi_Laporan_Lengkap || r.isi_laporan_lengkap),
    }));

    // 5. MATCH REVISIONS FROM NASRULLAH (Requirement 5)
    // Nasrullah's messages must be treated as revisions to existing dates, NOT new standalone reports!
    const revisiMap = new Map<string, WhatsAppReportItem>();
    revisiNasrullah.forEach((rev) => {
      if (rev.tanggal_laporan) {
        revisiMap.set(rev.tanggal_laporan, rev);
      }
    });

    laporanUtama.forEach((item) => {
      if (revisiMap.has(item.tanggal_laporan)) {
        const rev = revisiMap.get(item.tanggal_laporan)!;
        item.is_revision = true;
        item.revision_by = rev.pengirim || 'Nasrullah Jamaluddin';
        item.original_omzet = item.omzet_rp;
        item.revision_notes = `Revisi oleh ${rev.pengirim}: Omzet awal Rp ${item.omzet_rp.toLocaleString('id-ID')} disesuaikan menjadi Rp ${rev.omzet_rp.toLocaleString('id-ID')}`;
        // Store revised numbers
        if (rev.omzet_rp > 0) item.omzet_rp = rev.omzet_rp;
        if (rev.pengeluaran_total_rp > 0) item.pengeluaran_total_rp = rev.pengeluaran_total_rp;
        if (rev.masuk_tf_rp > 0) item.masuk_tf_rp = rev.masuk_tf_rp;
        if (rev.saldo_cash_rp > 0) item.saldo_cash_rp = rev.saldo_cash_rp;
        item.status_verifikasi = 'Telah Direvisi Nasrullah';
      }
    });

    // 6. DETECT DUPLICATES (Requirement 6)
    const dateGroups: Record<string, WhatsAppReportItem[]> = {};
    laporanUtama.forEach((item) => {
      const d = item.tanggal_laporan;
      if (!dateGroups[d]) dateGroups[d] = [];
      dateGroups[d].push(item);
    });

    const duplicatesList: Array<{ date: string; items: WhatsAppReportItem[] }> = [];
    let duplicateItemCount = 0;

    Object.entries(dateGroups).forEach(([date, group]) => {
      if (group.length > 1) {
        duplicatesList.push({ date, items: group });
        duplicateItemCount += group.length - 1;
        // Flag items as duplicates
        group.forEach((item, index) => {
          item.is_duplicate = true;
          item.duplicate_count = group.length;
          // By default, select the first valid non-typo one or latest, deselect extras
          if (index > 0) {
            item.selected_for_import = false;
          }
        });
      }
    });

    // 7. CALCULATE ACCURATE SUMMARY (Requirement 8)
    // Never sum up duplicates or unverified indiscriminately!
    let verifiedOmzet = 0;
    let unverifiedOmzet = 0;
    let unverifiedCount = 0;

    laporanUtama.forEach((item) => {
      // Skip inactive/deselected duplicate copies from calculation
      if (!item.selected_for_import) return;

      const isUnverified =
        item.status_verifikasi.toLowerCase().includes('perlu') ||
        item.status_verifikasi.toLowerCase().includes('belum') ||
        item.status_verifikasi.toLowerCase().includes('dicocokkan');

      if (isUnverified) {
        unverifiedCount++;
        unverifiedOmzet += item.omzet_rp;
      } else {
        verifiedOmzet += item.omzet_rp;
      }
    });

    const totalPengeluaranRp = rincianPengeluaran.reduce((sum, e) => sum + e.nominal_rp, 0);

    // Date range
    const validDates = laporanUtama
      .map((r) => r.tanggal_laporan)
      .filter((d) => Boolean(d) && d.length >= 8)
      .sort();

    const dateRange = {
      start: validDates[0] || '2025-01-01',
      end: validDates[validDates.length - 1] || '2026-12-31',
    };

    // Detect branch from file name or sender text
    let detectedBranchHint: string | undefined = undefined;
    const combinedText = (file.name + ' ' + (laporanUtama[0]?.pengirim || '')).toLowerCase();
    if (combinedText.includes('ulujami') || combinedText.includes('naufal')) {
      detectedBranchHint = 'Ulujami';
    } else if (combinedText.includes('cidodol')) {
      detectedBranchHint = 'Cidodol';
    }

    return {
      fileName: file.name,
      sheetNames,
      laporanUtama,
      revisiNasrullah,
      rincianPengeluaran,
      semuaLaporan,
      detectedBranchHint,
      summary: {
        totalUtama: laporanUtama.length,
        totalRevisi: revisiNasrullah.length,
        totalPengeluaran: rincianPengeluaran.length,
        totalSemua: semuaLaporan.length,
        duplicateCount: duplicateItemCount,
        unverifiedCount,
        verifiedOmzet,
        unverifiedOmzet,
        totalPengeluaranRp,
        dateRange,
      },
      duplicatesList,
    };
  },

  /**
   * Imports parsed data directly into Supabase (Requirement 7 & 9)
   */
  async importToSupabase(options: ImportOptions): Promise<ImportResult> {
    const {
      reports,
      expenses,
      targetBranch,
      userId,
      userName = 'Owner',
      applyRevisions = true,
      skipDuplicates = true,
      importExpenses = true,
      createSalesTransactions = true,
      onProgress,
    } = options;

    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!envUrl || !envKey) {
      throw new Error('Konfigurasi Supabase (URL / ANON KEY) belum tersedia di .env.local');
    }

    let importedReportsCount = 0;
    let appliedRevisionsCount = 0;
    let importedExpensesCount = 0;
    let importedSalesCount = 0;
    let skippedDuplicatesCount = 0;

    // Filter valid reports to import
    const seenDates = new Set<string>();
    const reportsToImport: WhatsAppReportItem[] = [];

    for (const r of reports) {
      if (!r.tanggal_laporan) continue;
      if (skipDuplicates && seenDates.has(r.tanggal_laporan)) {
        skippedDuplicatesCount++;
        continue;
      }
      seenDates.add(r.tanggal_laporan);
      reportsToImport.push(r);
    }

    const totalSteps = reportsToImport.length + (importExpenses ? expenses.length : 0);
    let completedSteps = 0;

    const reportProgress = (msg: string) => {
      const pct = Math.min(99, Math.round((completedSteps / (totalSteps || 1)) * 100));
      if (onProgress) onProgress(pct, msg);
    };

    reportProgress('Menyiapkan batch laporan harian...');

    // 1. BATCH UPSERT DAILY_REPORTS (Chunks of 50)
    const chunkSize = 50;
    for (let i = 0; i < reportsToImport.length; i += chunkSize) {
      const chunk = reportsToImport.slice(i, i + chunkSize);

      const dbRows = chunk.map((r) => {
        const isRev = Boolean(r.is_revision);
        if (isRev) appliedRevisionsCount++;

        // Rich WhatsApp notes formatted cleanly
        const noteParts: string[] = [];
        if (r.pengirim) noteParts.push(`[WhatsApp: ${r.pengirim}]`);
        if (r.pemesanan_adonan) noteParts.push(`Pemesanan: ${r.pemesanan_adonan}`);
        if (r.terjual_teks) noteParts.push(`Terjual: ${r.terjual_teks}`);
        if (r.sisa_adonan) noteParts.push(`Sisa: ${r.sisa_adonan}`);
        if (r.masuk_tf_rp > 0) noteParts.push(`Transfer: Rp ${r.masuk_tf_rp.toLocaleString('id-ID')}`);
        if (r.masuk_qr_rp > 0) noteParts.push(`QRIS: Rp ${r.masuk_qr_rp.toLocaleString('id-ID')}`);
        if (r.revision_notes) noteParts.push(r.revision_notes);
        if (r.status_verifikasi) noteParts.push(`Status: ${r.status_verifikasi}`);

        return {
          branch_id: targetBranch.id,
          report_date: r.tanggal_laporan,
          submitted_by: userId,
          gross_sales: r.omzet_rp || 0,
          total_transactions: r.terjual_teks ? parseNumber(r.terjual_teks) || 1 : 1,
          cash_sales: r.saldo_cash_rp > 0 ? r.saldo_cash_rp : Math.max(0, r.omzet_rp - (r.masuk_tf_rp || 0) - (r.masuk_qr_rp || 0)),
          non_cash_sales: (r.masuk_tf_rp || 0) + (r.masuk_qr_rp || 0),
          branch_cash_expenses: r.pengeluaran_total_rp || 0,
          initial_cash_balance: targetBranch.initial_cash_default || 100000,
          expected_cash: (targetBranch.initial_cash_default || 100000) + (r.saldo_cash_rp || 0) - (r.pengeluaran_total_rp || 0),
          actual_cash: r.saldo_cash_rp || 0,
          cash_difference: 0,
          notes: noteParts.join(' | '),
          status: isRev ? 'revision_requested' : (r.status_verifikasi.toLowerCase().includes('perlu') ? 'pending' : 'approved'),
        };
      });

      const res = await fetch(`${envUrl}/rest/v1/daily_reports?on_conflict=branch_id,report_date`, {
        method: 'POST',
        headers: {
          'apikey': envKey,
          'Authorization': `Bearer ${envKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(dbRows),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Supabase batch upsert daily_reports error:', errText);
        throw new Error(`Gagal menyimpan laporan harian ke Supabase: ${errText}`);
      }

      importedReportsCount += chunk.length;
      completedSteps += chunk.length;
      reportProgress(`Mengimpor laporan harian (${importedReportsCount}/${reportsToImport.length})...`);
    }

    // 2. BATCH INSERT EXPENSES FROM RINCIAN_PENGELUARAN (Chunks of 100)
    if (importExpenses && expenses.length > 0) {
      reportProgress('Mengimpor rincian pengeluaran...');
      const expChunkSize = 100;
      for (let i = 0; i < expenses.length; i += expChunkSize) {
        const chunk = expenses.slice(i, i + expChunkSize);

        const expDbRows = chunk.map((e) => ({
          branch_id: targetBranch.id,
          title: cleanText(e.rincian) || 'Pengeluaran WhatsApp',
          amount: e.nominal_rp || 0,
          payment_method: 'kas_cabang',
          notes: `[WA Import] Pengirim: ${e.pengirim || 'Kasir'} | ${e.status_verifikasi || ''}`,
          expense_date: e.tanggal_laporan || new Date().toISOString().split('T')[0],
          created_by: userId,
          status: 'approved',
        }));

        const resExp = await fetch(`${envUrl}/rest/v1/expenses`, {
          method: 'POST',
          headers: {
            'apikey': envKey,
            'Authorization': `Bearer ${envKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(expDbRows),
        });

        if (!resExp.ok) {
          console.warn('Expense batch insert warning:', await resExp.text());
        } else {
          importedExpensesCount += chunk.length;
        }

        completedSteps += chunk.length;
        reportProgress(`Mengimpor pengeluaran (${importedExpensesCount}/${expenses.length})...`);
      }
    }

    // 3. CONSOLIDATED SALES TRANSACTIONS FOR DASHBOARD (Chunks of 50)
    if (createSalesTransactions && reportsToImport.length > 0) {
      reportProgress('Menyinkronkan transaksi penjualan ke Dashboard...');
      const salesChunkSize = 50;

      for (let i = 0; i < reportsToImport.length; i += salesChunkSize) {
        const chunk = reportsToImport.slice(i, i + salesChunkSize);

        const salesRows = chunk.map((r) => {
          const cleanDate = r.tanggal_laporan.replace(/-/g, '');
          const trxNumber = `WA-${targetBranch.code || 'CAB'}-${cleanDate}`;
          const isCash = (r.saldo_cash_rp || 0) >= (r.omzet_rp || 0) * 0.7;

          return {
            transaction_number: trxNumber,
            branch_id: targetBranch.id,
            seller_id: userId,
            subtotal: r.omzet_rp || 0,
            discount: 0,
            total_amount: r.omzet_rp || 0,
            payment_method: isCash ? 'tunai' : 'transfer',
            cash_received: r.saldo_cash_rp || r.omzet_rp || 0,
            cash_change: 0,
            status: 'completed',
            created_at: `${r.tanggal_laporan}T12:00:00.000Z`,
          };
        });

        const resSales = await fetch(`${envUrl}/rest/v1/sales?on_conflict=transaction_number`, {
          method: 'POST',
          headers: {
            'apikey': envKey,
            'Authorization': `Bearer ${envKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(salesRows),
        });

        if (!resSales.ok) {
          console.warn('Sales batch upsert warning:', await resSales.text());
        } else {
          importedSalesCount += chunk.length;
        }
      }
    }

    if (onProgress) onProgress(100, 'Impor data selesai 100%!');

    return {
      success: true,
      importedReportsCount,
      appliedRevisionsCount,
      importedExpensesCount,
      importedSalesCount,
      skippedDuplicatesCount,
    };
  },
};
