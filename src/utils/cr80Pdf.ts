import { jsPDF } from 'jspdf';
import type { CardDesignConfig, MemberRecord, PackageConfig } from '../types/studio';
import { renderCr80DataUrl } from './cardRenderer';
import {
  computeCr80PdfLayout,
  CR80_HEIGHT_MM,
  CR80_WIDTH_MM,
  type Cr80PdfFormat,
} from './cr80PdfLayout';

export async function generateMemberCr80Pdf(options: {
  member: MemberRecord;
  design: CardDesignConfig;
  packages: PackageConfig[];
  format?: Cr80PdfFormat;
  frontDataUrl?: string;
  backDataUrl?: string;
  action?: 'download' | 'blob-url';
}): Promise<{ filename: string; blobUrl?: string }> {
  const format = options.format ?? 'a4-sheet';
  const layout = computeCr80PdfLayout(options.member, format);

  const [frontImg, backImg] = await Promise.all([
    options.frontDataUrl
      ? Promise.resolve(options.frontDataUrl)
      : renderCr80DataUrl('front', options.design, options.packages, {
          cardNumber: options.member.cardNumber,
          category: options.member.category,
        }),
    options.backDataUrl
      ? Promise.resolve(options.backDataUrl)
      : renderCr80DataUrl('back', options.design, options.packages, {
          cardNumber: options.member.cardNumber,
          category: options.member.category,
        }),
  ]);

  if (format === 'cr80-card') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [CR80_WIDTH_MM, CR80_HEIGHT_MM],
      compress: true,
    });

    doc.addImage(frontImg, 'PNG', 0, 0, CR80_WIDTH_MM, CR80_HEIGHT_MM);
    doc.addPage([CR80_WIDTH_MM, CR80_HEIGHT_MM], 'landscape');
    doc.addImage(backImg, 'PNG', 0, 0, CR80_WIDTH_MM, CR80_HEIGHT_MM);

    if (options.action === 'blob-url') {
      const blob = doc.output('blob');
      return { filename: layout.filename, blobUrl: URL.createObjectURL(blob) };
    }
    doc.save(layout.filename);
    return { filename: layout.filename };
  }

  // A4 print-ready sheet with registration data + 1:1 CR80 front & back + crop marks
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Top Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 14, 182, 20, 'F');
  doc.setFillColor(0, 139, 163);
  doc.rect(14, 14, 182, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FARID STUDIO MULTIMEDIA — KARTU MEMBER CR80 SIAP CETAK', 19, 23.5);

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'Ukuran Kartu Standar ISO CR80 (85.6 x 53.98 mm · 300 DPI) · Cetak 100% / Actual Size',
    19,
    29.5
  );

  // Member Metadata Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 33, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RINGKASAN DATA REGISTRASI MEMBER', 19, 44.5);

  doc.setFontSize(8.5);
  const leftMeta = layout.metadataRows.slice(0, 4);
  const rightMeta = layout.metadataRows.slice(4);

  leftMeta.forEach((row, idx) => {
    const yPos = 50.5 + idx * 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${row.label}:`, 19, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(row.value.slice(0, 34), 48, yPos);
  });

  rightMeta.forEach((row, idx) => {
    const yPos = 50.5 + idx * 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${row.label}:`, 108, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row.label === 'Status Kartu' ? 4 : 15, row.label === 'Status Kartu' ? 120 : 23, row.label === 'Status Kartu' ? 87 : 42);
    doc.text(row.value.slice(0, 34), 138, yPos);
  });

  // Render Front & Back CR80 at 1:1 physical dimensions with crop marks
  layout.cards.forEach((card) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(card.label, card.xMm, card.yMm - 4.5);

    const img = card.side === 'front' ? frontImg : backImg;
    doc.addImage(img, 'PNG', card.xMm, card.yMm, card.widthMm, card.heightMm);

    // Subtle border & crisp corner crop marks
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.rect(card.xMm, card.yMm, card.widthMm, card.heightMm);

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    card.cropMarks.forEach((m) => {
      doc.line(m.x1, m.y1, m.x2, m.y2);
    });
  });

  // Cutting & Print Instructions Footer Box
  const guideY = 148;
  doc.setDrawColor(186, 230, 253);
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(14, guideY, 182, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  doc.text('PANDUAN CETAK & PEMOTONGAN KARTU CR80', 19, guideY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    '1. Pada dialog printer, pilih Skala = 100% (Actual Size / Jangan pilih Fit to Page).',
    19,
    guideY + 12.5
  );
  doc.text(
    '2. Potong mengikuti tanda garis siku hitam (85.6 x 53.98 mm) lalu laminasi / cetak ke kartu PVC ID Card.',
    19,
    guideY + 18
  );

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${options.design.addressMain}  •  ${options.design.addressBranch}`,
    105,
    284,
    { align: 'center' }
  );

  if (options.action === 'blob-url') {
    const blob = doc.output('blob');
    return { filename: layout.filename, blobUrl: URL.createObjectURL(blob) };
  }
  doc.save(layout.filename);
  return { filename: layout.filename };
}

import type { AttendanceLog } from '../types/studio';
import {
  buildAnnualAttendanceReportData,
  buildMemberSummaryReportData,
  buildMonthlyAttendanceReportData,
  buildWeeklyAttendanceReportData,
} from './studioFeatures';

export async function generateBatchMembersCr80Pdf(options: {
  members: MemberRecord[];
  design: CardDesignConfig;
  packages: PackageConfig[];
}): Promise<{ filename: string; count: number }> {
  const targets = options.members;
  if (targets.length === 0) {
    throw new Error('Pilih minimal 1 member terlebih dahulu.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const perPage = 3;
  const horizontalGap = 10.8;
  const startX = Math.round(((210 - (CR80_WIDTH_MM * 2 + horizontalGap)) / 2) * 100) / 100;
  const backX = Math.round((startX + CR80_WIDTH_MM + horizontalGap) * 100) / 100;

  for (let i = 0; i < targets.length; i++) {
    const slotOnPage = i % perPage;
    if (i > 0 && slotOnPage === 0) {
      doc.addPage('a4', 'portrait');
    }

    if (slotOnPage === 0) {
      const pageNum = Math.floor(i / perPage) + 1;
      const totalPages = Math.ceil(targets.length / perPage);
      doc.setFillColor(15, 23, 42);
      doc.rect(14, 10, 182, 16, 'F');
      doc.setFillColor(0, 139, 163);
      doc.rect(14, 10, 182, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('FARID STUDIO — CETAK MASSAL KARTU MEMBER TERPILIH (CR80)', 18, 17.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Ukuran Asli CR80 85.6 x 53.98 mm · Skala Cetak 100% · Halaman ${pageNum}/${totalPages}`,
        18,
        22.5
      );
    }

    const member = targets[i];
    const rowTopY = 34 + slotOnPage * 82;
    const cardY = rowTopY + 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${i + 1}. ${member.cardNumber} — ${member.name.slice(0, 32)} (${member.category || 'Umum'} · ${member.status})`,
      startX,
      rowTopY + 3
    );

    const [frontImg, backImg] = await Promise.all([
      renderCr80DataUrl('front', options.design, options.packages, {
        cardNumber: member.cardNumber,
        category: member.category,
      }),
      renderCr80DataUrl('back', options.design, options.packages, {
        cardNumber: member.cardNumber,
        category: member.category,
      }),
    ]);

    doc.addImage(frontImg, 'PNG', startX, cardY, CR80_WIDTH_MM, CR80_HEIGHT_MM);
    doc.addImage(backImg, 'PNG', backX, cardY, CR80_WIDTH_MM, CR80_HEIGHT_MM);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.rect(startX, cardY, CR80_WIDTH_MM, CR80_HEIGHT_MM);
    doc.rect(backX, cardY, CR80_WIDTH_MM, CR80_HEIGHT_MM);
  }

  const filename = `KartuMember_CR80_Terpilih_${targets.length}Kartu_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return { filename, count: targets.length };
}

function drawFormalReportHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  design: CardDesignConfig
) {
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 12, 182, 24, 'F');
  doc.setFillColor(0, 139, 163);
  doc.rect(14, 12, 182, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(title, 19, 22);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(subtitle, 19, 28);
  doc.text(`${design.brandTitle || 'FARID STUDIO MULTIMEDIA'} · ${design.addressMain}`, 19, 33);
}

function drawReportStatCards(
  doc: jsPDF,
  y: number,
  cards: Array<{ label: string; value: string }>
) {
  const gap = 4;
  const cardW = (182 - gap * (cards.length - 1)) / cards.length;
  cards.forEach((c, idx) => {
    const x = 14 + idx * (cardW + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(c.label.toUpperCase(), x + 3.5, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(c.value, x + 3.5, y + 13.5);
  });
}

export function generateWeeklyAttendancePdf(
  logs: AttendanceLog[],
  design: CardDesignConfig
): { filename: string } {
  const report = buildWeeklyAttendanceReportData(logs);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  drawFormalReportHeader(
    doc,
    'LAPORAN PRESENSI MINGGUAN STUDIO (7 HARI TERAKHIR)',
    `Periode: ${report.rangeLabel} · Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
    design
  );

  drawReportStatCards(doc, 42, [
    { label: 'Total Kunjungan', value: `${report.totalVisits} check-in` },
    { label: 'Member Unik', value: `${report.uniqueMembers} member` },
    { label: 'Rata-rata / Hari', value: `${report.dailyAverage} / hari` },
    { label: 'Jam Puncak', value: report.peakHourLabel },
  ]);

  let y = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('REKAP HARIAN (7 HARI)', 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.text('Tanggal', 17, y + 4.8);
  doc.text('Jumlah Check-In', 95, y + 4.8);
  doc.text('Jam Ramai', 142, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  report.dailyBreakdown.forEach((d) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 6.5, 196, y + 6.5);
    doc.text(d.label.slice(0, 38), 17, y + 4.5);
    doc.text(`${d.count} kunjungan`, 95, y + 4.5);
    doc.text(d.peakHour, 142, y + 4.5);
    y += 6.5;
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('DAFTAR LOG CHECK-IN 7 HARI TERAKHIR', 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(7.5);
  doc.text('Waktu', 16, y + 4.8);
  doc.text('No. Kartu', 58, y + 4.8);
  doc.text('Nama Member', 86, y + 4.8);
  doc.text('Paket', 132, y + 4.8);
  doc.text('Keperluan', 158, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (report.logs.length === 0) {
    doc.text('Tidak ada data presensi dalam 7 hari terakhir.', 16, y + 6);
  } else {
    report.logs.slice(0, 45).forEach((l) => {
      if (y > 274) {
        doc.addPage('a4', 'portrait');
        y = 18;
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 6, 196, y + 6);
      doc.text(String(l.timestamp).slice(0, 22), 16, y + 4.2);
      doc.text(l.cardNumber, 58, y + 4.2);
      doc.text(l.name.slice(0, 24), 86, y + 4.2);
      doc.text(l.category.slice(0, 14), 132, y + 4.2);
      doc.text(l.purpose.slice(0, 22), 158, y + 4.2);
      y += 6;
    });
  }

  const filename = `Laporan_Mingguan_Presensi_${report.endDate}.pdf`;
  doc.save(filename);
  return { filename };
}

export function generateMonthlyAttendancePdf(
  logs: AttendanceLog[],
  yearMonth: string,
  design: CardDesignConfig
): { filename: string } {
  const report = buildMonthlyAttendanceReportData(logs, yearMonth);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  drawFormalReportHeader(
    doc,
    `LAPORAN RESMI PRESENSI BULANAN — ${report.monthLabel.toUpperCase()}`,
    `Periode: ${report.startDate} s/d ${report.endDate} · Arsip Manajemen Farid Studio`,
    design
  );

  drawReportStatCards(doc, 42, [
    { label: 'Total Kunjungan', value: `${report.totalVisits} check-in` },
    { label: 'Member Unik', value: `${report.uniqueMembers} member` },
    { label: 'Hari Aktif Studio', value: `${report.activeDaysCount} hari` },
    { label: 'Jam Puncak', value: report.peakHourLabel },
  ]);

  let y = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STATISTIK KATEGORI MEMBER BULAN INI', 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.text('Kategori Paket', 17, y + 4.8);
  doc.text('Jumlah Kunjungan', 95, y + 4.8);
  doc.text('Persentase', 150, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (report.categoryBreakdown.length === 0) {
    doc.text('Belum ada data kunjungan di bulan ini.', 17, y + 5.5);
    y += 7;
  } else {
    report.categoryBreakdown.forEach((c) => {
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 6.5, 196, y + 6.5);
      doc.text(c.category, 17, y + 4.5);
      doc.text(`${c.count} kunjungan`, 95, y + 4.5);
      doc.text(`${c.percentage}%`, 150, y + 4.5);
      y += 6.5;
    });
  }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RINCIAN KEHADIRAN MEMBER', 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(7.5);
  doc.text('Waktu', 16, y + 4.8);
  doc.text('No. Kartu', 58, y + 4.8);
  doc.text('Nama Member', 86, y + 4.8);
  doc.text('Paket', 132, y + 4.8);
  doc.text('Keperluan', 158, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  report.logs.slice(0, 60).forEach((l) => {
    if (y > 274) {
      doc.addPage('a4', 'portrait');
      y = 18;
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 6, 196, y + 6);
    doc.text(String(l.timestamp).slice(0, 22), 16, y + 4.2);
    doc.text(l.cardNumber, 58, y + 4.2);
    doc.text(l.name.slice(0, 24), 86, y + 4.2);
    doc.text(l.category.slice(0, 14), 132, y + 4.2);
    doc.text(l.purpose.slice(0, 22), 158, y + 4.2);
    y += 6;
  });

  const filename = `Laporan_Bulanan_Presensi_${report.yearMonth}.pdf`;
  doc.save(filename);
  return { filename };
}

export function generateAnnualAttendancePdf(
  logs: AttendanceLog[],
  year: number,
  design: CardDesignConfig
): { filename: string } {
  const report = buildAnnualAttendanceReportData(logs, year);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  drawFormalReportHeader(
    doc,
    `LAPORAN TAHUNAN ARSIP MANAJEMEN — TAHUN ${report.year}`,
    `Ringkasan Statistik Kunjungan, Tren Bulanan & Perbandingan Kategori Member`,
    design
  );

  drawReportStatCards(doc, 42, [
    { label: `Total Kunjungan ${report.year}`, value: `${report.totalVisits} check-in` },
    { label: 'Member Unik Tahunan', value: `${report.uniqueMembers} member` },
    { label: 'Rata-rata / Bulan', value: `${report.monthlyAverage} / bln` },
    { label: 'Bulan Tersibuk', value: `${report.peakMonthName} (${report.peakMonthVisits})` },
  ]);

  let y = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. TREN KUNJUNGAN BULANAN (JANUARI – DESEMBER ${report.year})`, 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.text('Bulan', 17, y + 4.8);
  doc.text('Total Kunjungan', 74, y + 4.8);
  doc.text('Member Unik', 114, y + 4.8);
  doc.text('Kategori Dominan', 150, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  report.monthlyBreakdown.forEach((row) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 6.5, 196, y + 6.5);
    doc.text(row.monthName, 17, y + 4.5);
    doc.text(`${row.visits} kunjungan`, 74, y + 4.5);
    doc.text(`${row.uniqueMembers} member`, 114, y + 4.5);
    doc.text(row.topCategory, 150, y + 4.5);
    y += 6.5;
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('2. PERBANDINGAN KATEGORI MEMBER TAHUNAN', 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.text('Kategori Paket Member', 17, y + 4.8);
  doc.text('Total Kunjungan', 95, y + 4.8);
  doc.text('Pangsa Kunjungan (%)', 145, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (report.categoryComparison.length === 0) {
    doc.text(`Belum ada data kunjungan tercatat pada tahun ${report.year}.`, 17, y + 5.5);
  } else {
    report.categoryComparison.forEach((c) => {
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 6.5, 196, y + 6.5);
      doc.text(c.category, 17, y + 4.5);
      doc.text(`${c.count} kunjungan`, 95, y + 4.5);
      doc.text(`${c.percentage}%`, 145, y + 4.5);
      y += 6.5;
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Disiapkan secara otomatis untuk arsip manajemen ${design.brandTitle || 'Farid Studio'} · ${new Date().toLocaleDateString('id-ID')}`,
    14,
    280
  );

  const filename = `Laporan_Tahunan_Manajemen_${report.year}.pdf`;
  doc.save(filename);
  return { filename };
}

export function generateMemberSummaryPdf(
  members: MemberRecord[],
  design: CardDesignConfig
): { filename: string } {
  const report = buildMemberSummaryReportData(members);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  drawFormalReportHeader(
    doc,
    'RINGKASAN DATABASE MEMBER FARID STUDIO',
    `Daftar Member Aktif, Statistik Kategori & Riwayat Pendaftaran Terbaru · ${new Date().toLocaleDateString('id-ID')}`,
    design
  );

  drawReportStatCards(doc, 42, [
    { label: 'Total Slot / Data', value: `${report.totalMembers} data` },
    { label: 'Member Aktif', value: `${report.activeCount} AKTIF` },
    { label: 'Slot Belum Aktif', value: `${report.inactiveCount} slot` },
    { label: 'Kategori Paket', value: `${report.categoryStats.length} kategori` },
  ]);

  let y = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. STATISTIK PER KATEGORI PAKET', 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.text('Kategori', 17, y + 4.8);
  doc.text('Total Data', 86, y + 4.8);
  doc.text('Member Aktif', 124, y + 4.8);
  doc.text('Pangsa', 166, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  report.categoryStats.forEach((c) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 6.5, 196, y + 6.5);
    doc.text(c.category, 17, y + 4.5);
    doc.text(`${c.total}`, 86, y + 4.5);
    doc.text(`${c.active} aktif`, 124, y + 4.5);
    doc.text(`${c.percentage}%`, 166, y + 4.5);
    y += 6.5;
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('2. DAFTAR MEMBER AKTIF & PENDAFTARAN TERBARU', 14, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(7.5);
  doc.text('No. Kartu', 16, y + 4.8);
  doc.text('Nama Member', 44, y + 4.8);
  doc.text('WhatsApp', 94, y + 4.8);
  doc.text('Paket', 130, y + 4.8);
  doc.text('Tgl Daftar', 158, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  report.activeMembers.slice(0, 65).forEach((m) => {
    if (y > 274) {
      doc.addPage('a4', 'portrait');
      y = 18;
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 6, 196, y + 6);
    doc.text(m.cardNumber, 16, y + 4.2);
    doc.text(m.name.slice(0, 26), 44, y + 4.2);
    doc.text((m.phone || '-').slice(0, 16), 94, y + 4.2);
    doc.text((m.category || 'Umum').slice(0, 14), 130, y + 4.2);
    doc.text((m.registeredAt || '-').slice(0, 18), 158, y + 4.2);
    y += 6;
  });

  const filename = `Ringkasan_Database_Member_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return { filename };
}

