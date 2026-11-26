import type { MemberRecord } from '../types/studio';

export const CR80_WIDTH_MM = 85.6;
export const CR80_HEIGHT_MM = 53.98;
export const CR80_CORNER_RADIUS_MM = 3.18;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export type Cr80PdfFormat = 'a4-sheet' | 'cr80-card';

export interface Cr80CardPlacement {
  side: 'front' | 'back';
  label: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  cropMarks: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

export interface Cr80PdfLayoutSpec {
  format: Cr80PdfFormat;
  pageWidthMm: number;
  pageHeightMm: number;
  filename: string;
  cards: Cr80CardPlacement[];
  metadataRows: Array<{ label: string; value: string }>;
}

function buildCropMarksForBox(
  x: number,
  y: number,
  w: number,
  h: number,
  markLen = 3.5,
  gap = 1.2
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const xEnd = x + w;
  const yEnd = y + h;
  return [
    // Top-left
    { x1: x - gap - markLen, y1: y, x2: x - gap, y2: y },
    { x1: x, y1: y - gap - markLen, x2: x, y2: y - gap },
    // Top-right
    { x1: xEnd + gap, y1: y, x2: xEnd + gap + markLen, y2: y },
    { x1: xEnd, y1: y - gap - markLen, x2: xEnd, y2: y - gap },
    // Bottom-left
    { x1: x - gap - markLen, y1: yEnd, x2: x - gap, y2: yEnd },
    { x1: x, y1: yEnd + gap, x2: x, y2: yEnd + gap + markLen },
    // Bottom-right
    { x1: xEnd + gap, y1: yEnd, x2: xEnd + gap + markLen, y2: yEnd },
    { x1: xEnd, y1: yEnd + gap, x2: xEnd, y2: yEnd + gap + markLen },
  ];
}

export function sanitizePdfFilenamePart(raw: string): string {
  return String(raw || 'MEMBER')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'MEMBER';
}

export function computeCr80PdfLayout(
  member: MemberRecord,
  format: Cr80PdfFormat = 'a4-sheet'
): Cr80PdfLayoutSpec {
  const safeCard = sanitizePdfFilenamePart(member.cardNumber);
  const metadataRows = [
    { label: 'Nomor Kartu', value: member.cardNumber || '-' },
    { label: 'Nama Member', value: member.name || '-' },
    { label: 'Paket Member', value: member.category || 'Umum' },
    { label: 'No. WhatsApp', value: member.phone || '-' },
    { label: 'Instansi / Kampus', value: member.org || '-' },
    { label: 'Status Kartu', value: member.status || 'AKTIF' },
    { label: 'Tanggal Aktivasi', value: member.registeredAt || '-' },
  ];

  if (format === 'cr80-card') {
    return {
      format,
      pageWidthMm: CR80_WIDTH_MM,
      pageHeightMm: CR80_HEIGHT_MM,
      filename: `KartuMember_CR80_${safeCard}.pdf`,
      cards: [
        {
          side: 'front',
          label: 'Sisi Depan (CR80 85.6 × 53.98 mm)',
          xMm: 0,
          yMm: 0,
          widthMm: CR80_WIDTH_MM,
          heightMm: CR80_HEIGHT_MM,
          cropMarks: [],
        },
        {
          side: 'back',
          label: 'Sisi Belakang (CR80 85.6 × 53.98 mm)',
          xMm: 0,
          yMm: 0,
          widthMm: CR80_WIDTH_MM,
          heightMm: CR80_HEIGHT_MM,
          cropMarks: [],
        },
      ],
      metadataRows,
    };
  }

  // A4 print-ready sheet: Front & Back placed side by side at true 1:1 85.6mm x 53.98mm
  const horizontalGapMm = 10.8;
  const totalCardsWidth = CR80_WIDTH_MM * 2 + horizontalGapMm;
  const startX = Math.round(((A4_WIDTH_MM - totalCardsWidth) / 2) * 100) / 100;
  const cardY = 82;

  const frontX = startX;
  const backX = Math.round((startX + CR80_WIDTH_MM + horizontalGapMm) * 100) / 100;

  return {
    format,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    filename: `KartuMember_CR80_SiapCetak_${safeCard}.pdf`,
    cards: [
      {
        side: 'front',
        label: 'SISI DEPAN (85.6 × 53.98 mm)',
        xMm: frontX,
        yMm: cardY,
        widthMm: CR80_WIDTH_MM,
        heightMm: CR80_HEIGHT_MM,
        cropMarks: buildCropMarksForBox(frontX, cardY, CR80_WIDTH_MM, CR80_HEIGHT_MM),
      },
      {
        side: 'back',
        label: 'SISI BELAKANG (85.6 × 53.98 mm)',
        xMm: backX,
        yMm: cardY,
        widthMm: CR80_WIDTH_MM,
        heightMm: CR80_HEIGHT_MM,
        cropMarks: buildCropMarksForBox(backX, cardY, CR80_WIDTH_MM, CR80_HEIGHT_MM),
      },
    ],
    metadataRows,
  };
}
