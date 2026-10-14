import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const localPath = 'C:\\Users\\User\\Downloads\\MUTASI\\Rekap_Laporan_Penjualan_Naufal_Ulujami_2025-sekarang.xlsx';

  try {
    if (fs.existsSync(localPath)) {
      const fileBuffer = fs.readFileSync(localPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="Rekap_Laporan_Penjualan_Naufal_Ulujami_2025-sekarang.xlsx"',
        },
      });
    }

    return NextResponse.json({ error: 'File tidak ditemukan di folder lokal' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
