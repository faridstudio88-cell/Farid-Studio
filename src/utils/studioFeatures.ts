import type {
  AttendanceLog,
  MemberRecord,
  StudioBranchLocation,
  WaAutoReplySettings,
  WaDeliveryLog,
  WaMessageTemplate,
} from '../types/studio';
import {
  buildCategoryVisitDistribution,
  buildHourlyPeakStats,
  buildLast7DaysCheckInStats,
  filterAttendanceLogsByDateRange,
  formatUtcDateKey,
  formatWhatsAppUrl,
  resolveAttendanceDatePreset,
  type CategoryDistributionPoint,
} from './cardLogic';

export function buildGoogleMapsPlaceUrl(address: string, lat?: number, lng?: number): string {
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Farid Studio Makassar')}`;
}

export const DEFAULT_STUDIO_BRANCHES: StudioBranchLocation[] = [
  {
    id: 'utama',
    title: 'Farid Studio Utama (Sudiang)',
    subtitle: 'Studio Utama & Meja Aktivasi Kartu CR80',
    address: 'Jl. Perintis Kemerdekaan Km.16 No.49 Sudiang, Makassar',
    hours: 'Setiap Hari · 09.00 – 21.00 WITA',
    position: { lat: -5.0846, lng: 119.5126 },
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=-5.084600,119.512600',
  },
  {
    id: 'cabang',
    title: 'Farid Studio Cabang (Taman Sudiang Indah)',
    subtitle: 'Cabang Sesi Foto Studio & Cetak Bingkai',
    address: 'Jl. Poros Taman Sudiang Indah, Makassar',
    hours: 'Setiap Hari · 09.30 – 21.00 WITA',
    position: { lat: -5.0789, lng: 119.5208 },
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=-5.078900,119.520800',
  },
];

export function sanitizeCoordinates(
  lat: number,
  lng: number
): { valid: boolean; lat: number; lng: number } {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, lat: -5.0846, lng: 119.5126 };
  }
  const clampedLat = Math.max(-90, Math.min(90, Number(lat.toFixed(6))));
  const clampedLng = Math.max(-180, Math.min(180, Number(lng.toFixed(6))));
  return { valid: true, lat: clampedLat, lng: clampedLng };
}

export function updateStudioBranchLocation(
  branches: StudioBranchLocation[],
  branchId: StudioBranchLocation['id'],
  patch: {
    title?: string;
    subtitle?: string;
    address?: string;
    hours?: string;
    lat?: number;
    lng?: number;
  }
): StudioBranchLocation[] {
  return branches.map((b) => {
    if (b.id !== branchId) return b;
    const nextLat = typeof patch.lat === 'number' ? patch.lat : b.position.lat;
    const nextLng = typeof patch.lng === 'number' ? patch.lng : b.position.lng;
    const coords = sanitizeCoordinates(nextLat, nextLng);
    const position = coords.valid ? { lat: coords.lat, lng: coords.lng } : b.position;
    const nextAddress =
      typeof patch.address === 'string' && patch.address.trim()
        ? patch.address.trim()
        : b.address;
    return {
      ...b,
      title:
        typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim() : b.title,
      subtitle:
        typeof patch.subtitle === 'string' && patch.subtitle.trim()
          ? patch.subtitle.trim()
          : b.subtitle,
      address: nextAddress,
      hours:
        typeof patch.hours === 'string' && patch.hours.trim() ? patch.hours.trim() : b.hours,
      position,
      mapsUrl: buildGoogleMapsPlaceUrl(nextAddress, position.lat, position.lng),
    };
  });
}

export const DEFAULT_WA_TEMPLATES: WaMessageTemplate[] = [
  {
    id: 'tpl-promo-aktif',
    name: 'Sapaan & Promo Member Aktif',
    body: 'Halo {{nama}}, terima kasih sudah menjadi Member Resmi Farid Studio Multimedia dengan nomor kartu {{kartu}} ({{paket}}). Nikmati diskon sesi foto & cetak bingkai khusus member aktif bulan ini!',
  },
  {
    id: 'tpl-auto-aktif',
    name: 'Konfirmasi Kartu Aktif (Auto-Reply)',
    body: 'Selamat {{nama}}! Kartu Member {{kartu}} ({{paket}}) Anda kini berstatus {{status}} di {{studio}}. Tunjukkan kartu fisik atau kartu digital Anda di kasir untuk menikmati seluruh benefit member.',
  },
  {
    id: 'tpl-auto-checkin',
    name: 'Ucapan Check-In Kehadiran (Auto-Reply)',
    body: 'Terima kasih telah berkunjung ke {{studio}}, {{nama}}! Presensi kartu member {{kartu}} ({{paket}}) berhasil dicatat. Selamat menikmati sesi foto & layanan studio terbaik kami!',
  },
];

export const DEFAULT_WA_AUTO_REPLY: WaAutoReplySettings = {
  onActivated: true,
  onCheckIn: false,
  activatedTemplateId: 'tpl-auto-aktif',
  checkInTemplateId: 'tpl-auto-checkin',
};

export function renderWaTemplate(
  templateBody: string,
  vars: {
    nama?: string;
    kartu?: string;
    paket?: string;
    status?: string;
    studio?: string;
  }
): string {
  const map: Record<string, string> = {
    nama: (vars.nama || 'Member').trim(),
    kartu: (vars.kartu || 'FS-0000').trim(),
    paket: (vars.paket || 'Umum').trim(),
    status: (vars.status || 'AKTIF').trim(),
    studio: (vars.studio || 'Farid Studio Multimedia').trim(),
  };

  return String(templateBody || '').replace(/\{\{\s*(nama|kartu|paket|status|studio)\s*\}\}/gi, (_, key: string) => {
    const k = key.toLowerCase();
    return map[k] ?? '';
  });
}

export function validateWaPhoneForDelivery(phone: string): {
  valid: boolean;
  waUrl: string;
  errorReason?: string;
} {
  const trimmed = String(phone || '').trim();
  if (!trimmed || trimmed === '-') {
    return {
      valid: false,
      waUrl: '',
      errorReason: 'Nomor WhatsApp kosong atau belum diisi.',
    };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    return {
      valid: false,
      waUrl: '',
      errorReason: 'Format nomor salah atau panjang digit tidak valid (harus 9–15 digit).',
    };
  }
  if (!digits.startsWith('0') && !digits.startsWith('62') && !digits.startsWith('8')) {
    return {
      valid: false,
      waUrl: '',
      errorReason: 'Nomor tidak diawali kode Indonesia (08 / +62 / 62).',
    };
  }
  const baseUrl = formatWhatsAppUrl(trimmed);
  if (!baseUrl) {
    return {
      valid: false,
      waUrl: '',
      errorReason: 'Nomor tidak dapat dikonversi ke tautan wa.me.',
    };
  }
  return {
    valid: true,
    waUrl: baseUrl,
  };
}

export function createWaDeliveryLog(options: {
  member: Pick<MemberRecord, 'cardNumber' | 'name' | 'phone' | 'category' | 'status'>;
  template: WaMessageTemplate;
  triggerType: WaDeliveryLog['triggerType'];
  studioTitle?: string;
  markAsSent?: boolean;
  now?: Date;
}): WaDeliveryLog {
  const now = options.now || new Date();
  const timestamp = now.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const message = renderWaTemplate(options.template.body, {
    nama: options.member.name,
    kartu: options.member.cardNumber,
    paket: options.member.category,
    status: options.member.status,
    studio: options.studioTitle || 'Farid Studio Multimedia',
  });
  const check = validateWaPhoneForDelivery(options.member.phone);
  const waUrl = check.valid
    ? `${check.waUrl}?text=${encodeURIComponent(message)}`
    : '';

  return {
    id: `WA-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    cardNumber: options.member.cardNumber,
    memberName: options.member.name,
    phone: options.member.phone || '-',
    triggerType: options.triggerType,
    templateName: options.template.name,
    message,
    waUrl,
    status: !check.valid ? 'GAGAL' : options.markAsSent ? 'TERKIRIM' : 'SIAP_KIRIM',
    errorReason: check.errorReason,
  };
}

export interface WeeklyAttendanceReportData {
  startDate: string;
  endDate: string;
  rangeLabel: string;
  totalVisits: number;
  uniqueMembers: number;
  dailyAverage: number;
  peakHourLabel: string;
  dailyBreakdown: Array<{ dateKey: string; label: string; count: number; peakHour: string }>;
  categoryBreakdown: CategoryDistributionPoint[];
  logs: AttendanceLog[];
}

export function buildWeeklyAttendanceReportData(
  logs: AttendanceLog[],
  referenceDate = new Date()
): WeeklyAttendanceReportData {
  const preset = resolveAttendanceDatePreset('7d', referenceDate);
  const scoped = filterAttendanceLogsByDateRange(
    logs,
    preset.startDate,
    preset.endDate,
    referenceDate
  );
  const daily = buildLast7DaysCheckInStats(scoped, referenceDate);
  const hourly = buildHourlyPeakStats(scoped);
  let peakHour = hourly[0];
  hourly.forEach((h) => {
    if (h.count > peakHour.count) peakHour = h;
  });

  const uniqueMembers = new Set(scoped.map((l) => l.cardNumber).filter(Boolean)).size;
  return {
    startDate: preset.startDate,
    endDate: preset.endDate,
    rangeLabel: `${preset.startDate} s/d ${preset.endDate}`,
    totalVisits: scoped.length,
    uniqueMembers,
    dailyAverage: Math.round((scoped.length / 7) * 10) / 10,
    peakHourLabel: peakHour && peakHour.count > 0 ? peakHour.hourLabel : '-',
    dailyBreakdown: daily.map((d) => ({
      dateKey: d.dateKey,
      label: d.fullDate,
      count: d.count,
      peakHour: d.peakHourLabel,
    })),
    categoryBreakdown: buildCategoryVisitDistribution(scoped),
    logs: scoped,
  };
}

export interface MonthlyAttendanceReportData {
  yearMonth: string;
  monthLabel: string;
  startDate: string;
  endDate: string;
  totalVisits: number;
  uniqueMembers: number;
  activeDaysCount: number;
  dailyAverage: number;
  peakHourLabel: string;
  categoryBreakdown: CategoryDistributionPoint[];
  logs: AttendanceLog[];
}

export function buildMonthlyAttendanceReportData(
  logs: AttendanceLog[],
  yearMonth: string
): MonthlyAttendanceReportData {
  const match = String(yearMonth || '').match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const month = match ? Number(match[2]) : now.getUTCMonth() + 1;
  const safeMonth = Math.max(1, Math.min(12, month));
  const ym = `${year}-${String(safeMonth).padStart(2, '0')}`;
  const startDate = `${ym}-01`;
  const lastDay = new Date(Date.UTC(year, safeMonth, 0));
  const endDate = formatUtcDateKey(lastDay);

  const scoped = logs.filter((l) => String(l.dateKey || '').startsWith(ym));
  const uniqueMembers = new Set(scoped.map((l) => l.cardNumber).filter(Boolean)).size;
  const activeDaysCount = new Set(scoped.map((l) => l.dateKey).filter(Boolean)).size;
  const hourly = buildHourlyPeakStats(scoped);
  let peakHour = hourly[0];
  hourly.forEach((h) => {
    if (h.count > peakHour.count) peakHour = h;
  });

  const monthDate = new Date(Date.UTC(year, safeMonth - 1, 1));
  const monthLabel = monthDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return {
    yearMonth: ym,
    monthLabel,
    startDate,
    endDate,
    totalVisits: scoped.length,
    uniqueMembers,
    activeDaysCount,
    dailyAverage:
      Math.round((scoped.length / Math.max(1, lastDay.getUTCDate())) * 10) / 10,
    peakHourLabel: peakHour && peakHour.count > 0 ? peakHour.hourLabel : '-',
    categoryBreakdown: buildCategoryVisitDistribution(scoped),
    logs: scoped,
  };
}

export interface AnnualMonthlyRow {
  monthNumber: number;
  monthKey: string;
  monthName: string;
  visits: number;
  uniqueMembers: number;
  topCategory: string;
}

export interface AnnualAttendanceReportData {
  year: number;
  totalVisits: number;
  uniqueMembers: number;
  monthlyAverage: number;
  peakMonthName: string;
  peakMonthVisits: number;
  monthlyBreakdown: AnnualMonthlyRow[];
  categoryComparison: CategoryDistributionPoint[];
}

export function buildAnnualAttendanceReportData(
  logs: AttendanceLog[],
  year: number
): AnnualAttendanceReportData {
  const safeYear = Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getUTCFullYear();
  const yearPrefix = `${safeYear}-`;
  const yearLogs = logs.filter((l) => String(l.dateKey || '').startsWith(yearPrefix));

  const monthlyBreakdown: AnnualMonthlyRow[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    const monthKey = `${safeYear}-${mm}`;
    const mLogs = yearLogs.filter((l) => String(l.dateKey || '').startsWith(monthKey));
    const unique = new Set(mLogs.map((l) => l.cardNumber).filter(Boolean)).size;
    const cats = buildCategoryVisitDistribution(mLogs);
    const monthDate = new Date(Date.UTC(safeYear, m - 1, 1));
    const monthName = monthDate.toLocaleDateString('id-ID', {
      month: 'long',
      timeZone: 'UTC',
    });

    monthlyBreakdown.push({
      monthNumber: m,
      monthKey,
      monthName,
      visits: mLogs.length,
      uniqueMembers: unique,
      topCategory: cats[0] ? `${cats[0].category} (${cats[0].count})` : '-',
    });
  }

  let peakMonth = monthlyBreakdown[0];
  monthlyBreakdown.forEach((row) => {
    if (row.visits > peakMonth.visits) peakMonth = row;
  });

  const uniqueMembers = new Set(yearLogs.map((l) => l.cardNumber).filter(Boolean)).size;

  return {
    year: safeYear,
    totalVisits: yearLogs.length,
    uniqueMembers,
    monthlyAverage: Math.round((yearLogs.length / 12) * 10) / 10,
    peakMonthName: peakMonth && peakMonth.visits > 0 ? peakMonth.monthName : '-',
    peakMonthVisits: peakMonth ? peakMonth.visits : 0,
    monthlyBreakdown,
    categoryComparison: buildCategoryVisitDistribution(yearLogs),
  };
}

export interface MemberSummaryReportData {
  totalMembers: number;
  activeCount: number;
  inactiveCount: number;
  categoryStats: Array<{ category: string; total: number; active: number; percentage: number }>;
  activeMembers: MemberRecord[];
  recentRegistrations: MemberRecord[];
}

export function buildMemberSummaryReportData(members: MemberRecord[]): MemberSummaryReportData {
  const activeMembers = members.filter((m) => m.status === 'AKTIF');
  const inactiveCount = members.length - activeMembers.length;

  const byCat = new Map<string, { total: number; active: number }>();
  members.forEach((m) => {
    const cat = String(m.category || 'Umum').trim() || 'Umum';
    const curr = byCat.get(cat) || { total: 0, active: 0 };
    curr.total += 1;
    if (m.status === 'AKTIF') curr.active += 1;
    byCat.set(cat, curr);
  });

  const totalMembers = members.length;
  const categoryStats = Array.from(byCat.entries())
    .map(([category, stats]) => ({
      category,
      total: stats.total,
      active: stats.active,
      percentage: totalMembers > 0 ? Math.round((stats.total / totalMembers) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

  const recentRegistrations = activeMembers.slice(0, 20);

  return {
    totalMembers,
    activeCount: activeMembers.length,
    inactiveCount,
    categoryStats,
    activeMembers,
    recentRegistrations,
  };
}
