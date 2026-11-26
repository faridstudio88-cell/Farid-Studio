import type {
  AttendanceLog,
  CardDesignConfig,
  DuplicateAttemptLog,
  DuplicateReason,
  MemberRecord,
  PackageConfig,
  ThemeKey,
} from '../types/studio';

export const STORAGE_KEY = 'farid_studio_member_db_v4';
export const DEFAULT_PIN_HASH =
  '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
export const DEFAULT_MASTER_KEY_HASH =
  '00496b16a7f7535f519a1c2e1c1b895dc1f6518c55f142a9343e60c02f28d124';

export const THEME_PRESETS: Record<ThemeKey, { primary: string; accent: string; dark: string }> = {
  'teal-modern': { primary: '#008ba3', accent: '#12a3bd', dark: '#0b2239' },
  'studio-geometric': { primary: '#00839a', accent: '#67c9f5', dark: '#0b1c2c' },
  'photo-studio-pro': { primary: '#0f172a', accent: '#d4af37', dark: '#0b0f17' },
  'exclusive-vip': { primary: '#b45309', accent: '#f59e0b', dark: '#090d16' },
  'royal-navy': { primary: '#1d4ed8', accent: '#eab308', dark: '#0f172a' },
  'emerald-prestige': { primary: '#047857', accent: '#10b981', dark: '#062c22' },
  'pearl-minimal': { primary: '#334155', accent: '#0284c7', dark: '#1e293b' },
};

export const CARD_DESIGN_LABELS: Record<ThemeKey, string> = {
  'teal-modern': 'Teal Modern (Biru Putih)',
  'studio-geometric': 'Studio Geometric (Sesuai Referensi)',
  'photo-studio-pro': 'Photo Studio Pro (Editorial Dark)',
  'exclusive-vip': 'Exclusive VIP (Hitam Emas)',
  'royal-navy': 'Royal Navy & Gold',
  'emerald-prestige': 'Emerald Studio Prestige',
  'pearl-minimal': 'Pearl White Minimalist',
};

export const DEFAULT_DESIGN: CardDesignConfig = {
  theme: 'teal-modern',
  brandTitle: 'FARID STUDIO',
  phoneText: '+62-8523-097-571',
  primaryColor: '#008ba3',
  accentColor: '#12a3bd',
  darkColor: '#0b2239',
  titleSize: 48,
  qrSize: 155,
  badgeLabel: 'KARTU MEMBER',
  serialPrefix: 'FS',
  packageDisplay: '',
  cardCaption: 'Tunjukkan kartu ini untuk diskon sesi foto & cetak di Farid Studio.',
  qrLabel: 'SCAN AKTIVASI / CEK KARTU',
  backTitle: 'SYARAT & KETENTUAN MEMBER',
  instagram: '@faridstudiomakassar',
  hashtag: '#AbadikanMomenBersamaFaridStudio',
  addressMain: 'Jl. Perintis Kemerdekaan Km.16 No.49 Sudiang Makassar',
  addressBranch: 'Cabang: Jl. Poros Taman Sudiang Indah Makassar',
};

export const DEFAULT_PACKAGES: PackageConfig[] = [
  {
    id: 'Umum',
    prefix: 'FS',
    cardLabel: 'Paket: Umum',
    name: 'Paket Umum',
    price: 50000,
    duration: '1 Tahun',
    badge: 'Reguler',
    color: 'cyan',
    benefits: 'Diskon 10% semua sesi foto, gratis cetak 2R (2 lembar), prioritas antrean.',
  },
  {
    id: 'Mahasiswa',
    prefix: 'MHS',
    cardLabel: 'Paket: Mahasiswa',
    name: 'Paket Mahasiswa',
    price: 35000,
    duration: '1 Tahun',
    badge: 'Hemat Pelajar',
    color: 'sky',
    benefits: 'Diskon 15% pas foto & studio, gratis softfile edit, wajib kartu mahasiswa.',
  },
  {
    id: 'Wisudawan',
    prefix: 'WSD',
    cardLabel: 'Paket: Wisudawan',
    name: 'Paket Wisudawan',
    price: 150000,
    duration: '2 Tahun',
    badge: 'Terlaris',
    color: 'indigo',
    benefits: 'Diskon 20% paket wisuda keluarga, gratis 1 cetak 10R + frame, akses fast-track.',
  },
  {
    id: 'VIP',
    prefix: 'VIP',
    cardLabel: 'Paket: VIP Studio',
    name: 'Paket VIP Studio',
    price: 300000,
    duration: '3 Tahun',
    badge: 'VIP Member',
    color: 'emerald',
    benefits: 'Diskon 25% semua layanan, gratis 1x sesi mini studio/tahun, bebas biaya reschedule.',
  },
  {
    id: 'Exclusive',
    prefix: 'EXC',
    cardLabel: 'Paket: Exclusive Gold',
    name: 'Paket Exclusive (0001–1000)',
    price: 500000,
    duration: 'Seumur Hidup',
    badge: 'VIP Gold Limited',
    color: 'amber',
    benefits: 'Kartu edisi terbatas Gold VIP, diskon 30% selamanya, gratis sesi foto ulang tahun.',
  },
];

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(String(text));
  if (globalThis.crypto && globalThis.crypto.subtle) {
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h << 5) - h + text.charCodeAt(i);
  return 'fallback_' + Math.abs(h).toString(16);
}

export function formatSerialDigits(num: number | string): string {
  const n = Math.max(1, parseInt(String(num), 10) || 1);
  return n < 10000 ? String(n).padStart(4, '0') : String(n);
}

export function normalizeCardNumber(raw: string, defaultPrefix = 'FS'): string {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s./_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!cleaned) return '';
  const pref = (defaultPrefix || 'FS').toUpperCase();
  if (/^\d+$/.test(cleaned)) {
    return `${pref}-${formatSerialDigits(cleaned)}`;
  }
  const hyphenMatch = cleaned.match(/^([A-Z0-9]+)-(\d+)$/);
  if (hyphenMatch) {
    return `${hyphenMatch[1]}-${formatSerialDigits(hyphenMatch[2])}`;
  }
  const compactMatch = cleaned.match(/^([A-Z]+)(\d+)$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${formatSerialDigits(compactMatch[2])}`;
  }
  return cleaned;
}

export function normalizePhoneNumber(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0062')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('62')) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('8')) {
    digits = '0' + digits;
  }
  return digits;
}

export function formatWhatsAppUrl(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0062')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  }
  return digits.length >= 8 ? `https://wa.me/${digits}` : '';
}

export function extractCardNumberFromScan(rawText: string, defaultPrefix = 'FS'): string {
  if (!rawText) return '';
  const trimmed = String(rawText).trim();
  const urlMatch = trimmed.match(/[?&]kartu=([A-Za-z0-9-]+)/i);
  if (urlMatch && urlMatch[1]) return normalizeCardNumber(urlMatch[1], defaultPrefix);
  const fsMatch = trimmed.match(/([A-Z0-9]+-\d+)/i);
  if (fsMatch && fsMatch[1]) return normalizeCardNumber(fsMatch[1], defaultPrefix);
  if (/^\d+$/.test(trimmed)) return normalizeCardNumber(trimmed, defaultPrefix);
  return trimmed.toUpperCase();
}

export function getCardDesignLabel(themeKey: ThemeKey | string): string {
  return CARD_DESIGN_LABELS[themeKey as ThemeKey] || themeKey || 'Teal Modern (Biru Putih)';
}

export function seedInitialMembers(): MemberRecord[] {
  return [
    {
      cardNumber: 'FS-0001',
      name: 'Andi Muhammad Farid',
      phone: '085241483041',
      category: 'Exclusive',
      cardDesign: 'Exclusive VIP (Hitam Emas)',
      org: 'Farid Studio Makassar',
      address: 'Jl. Perintis Kemerdekaan Km.16 Sudiang',
      nik: '7371110101950001',
      kkNumber: '7371110101180001',
      kkRelation: 'Kepala Keluarga',
      ktpAddress: 'Jl. Perintis Kemerdekaan Km.16 No.49 Sudiang Makassar',
      status: 'AKTIF',
      registeredAt: '01 Jan 2026',
      notes: 'Founder VIP Member',
    },
    {
      cardNumber: 'FS-0002',
      name: 'Siti Nurhaliza Putri',
      phone: '081342998877',
      category: 'Wisudawan',
      cardDesign: 'Teal Modern (Biru Putih)',
      org: 'Universitas Hasanuddin',
      address: 'Tamalanrea, Makassar',
      nik: '',
      kkNumber: '',
      kkRelation: 'Anak',
      ktpAddress: '',
      status: 'AKTIF',
      registeredAt: '14 Feb 2026',
      notes: 'Paket Wisuda Keluarga',
    },
  ];
}

export interface RegistrationPayload {
  rawCardNumber: string;
  name: string;
  phone: string;
  category: string;
  org?: string;
  address?: string;
  defaultPrefix?: string;
  theme?: ThemeKey;
  registeredAt?: string;
}

export interface DuplicateCheckResult {
  allowed: boolean;
  cardNumber: string;
  normalizedPhone: string;
  duplicateReason?: DuplicateReason;
  matchedMember?: MemberRecord;
  error?: string;
}

export function isCardAlreadyClaimed(member: MemberRecord): boolean {
  if (member.status === 'AKTIF') return true;
  const cleanName = String(member.name || '').trim();
  return (
    cleanName !== '' &&
    cleanName !== 'Slot Kartu Belum Terisi' &&
    Boolean(member.registeredAt && member.registeredAt !== '-')
  );
}

export function validateMemberRegistrationEligibility(
  members: MemberRecord[],
  payload: Pick<RegistrationPayload, 'rawCardNumber' | 'name' | 'phone' | 'defaultPrefix'>
): DuplicateCheckResult {
  const cardNumber = normalizeCardNumber(payload.rawCardNumber, payload.defaultPrefix || 'FS');
  const name = payload.name.trim();
  const normalizedPhone = normalizePhoneNumber(payload.phone);

  if (!cardNumber || !name || !payload.phone.trim()) {
    return {
      allowed: false,
      cardNumber,
      normalizedPhone,
      error: 'Nomor kartu, nama lengkap, dan nomor WhatsApp wajib diisi!',
    };
  }

  if (normalizedPhone.length < 8) {
    return {
      allowed: false,
      cardNumber,
      normalizedPhone,
      duplicateReason: 'INVALID_PHONE',
      error: 'Nomor WhatsApp tidak valid. Masukkan minimal 8 digit angka yang aktif.',
    };
  }

  const existingCard = members.find(
    (m) =>
      normalizeCardNumber(m.cardNumber, payload.defaultPrefix || 'FS').toUpperCase() ===
      cardNumber.toUpperCase()
  );
  if (existingCard && isCardAlreadyClaimed(existingCard)) {
    return {
      allowed: false,
      cardNumber,
      normalizedPhone,
      duplicateReason: 'CARD_ALREADY_ACTIVE',
      matchedMember: existingCard,
      error: `Pencegahan Daftar 2x: Nomor kartu ${existingCard.cardNumber} sudah terdaftar atas nama ${existingCard.name}. Satu nomor kartu hanya boleh didaftarkan 1 kali — gunakan menu Cek Kartu.`,
    };
  }

  const existingPhoneOwner = members.find((m) => {
    if (!isCardAlreadyClaimed(m)) return false;
    const memberPhone = normalizePhoneNumber(m.phone);
    return memberPhone.length >= 8 && memberPhone === normalizedPhone;
  });
  if (existingPhoneOwner) {
    return {
      allowed: false,
      cardNumber,
      normalizedPhone,
      duplicateReason: 'PHONE_ALREADY_REGISTERED',
      matchedMember: existingPhoneOwner,
      error: `Pencegahan Daftar 2x: Nomor WhatsApp ${payload.phone.trim()} sudah terdaftar sebagai member (${existingPhoneOwner.cardNumber} — ${existingPhoneOwner.name}). Satu WhatsApp hanya berlaku untuk 1 kartu member.`,
    };
  }

  return {
    allowed: true,
    cardNumber,
    normalizedPhone,
  };
}

export function upsertMemberRegistration(
  members: MemberRecord[],
  payload: RegistrationPayload
): {
  members: MemberRecord[];
  saved: MemberRecord | null;
  error?: string;
  duplicateReason?: DuplicateReason;
  matchedMember?: MemberRecord;
} {
  const eligibility = validateMemberRegistrationEligibility(members, payload);
  if (!eligibility.allowed) {
    return {
      members,
      saved: null,
      error: eligibility.error,
      duplicateReason: eligibility.duplicateReason,
      matchedMember: eligibility.matchedMember,
    };
  }

  const cardNumber = eligibility.cardNumber;
  const name = payload.name.trim();
  const phone = payload.phone.trim();

  const today =
    payload.registeredAt ||
    new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const existingIdx = members.findIndex((m) => m.cardNumber.toUpperCase() === cardNumber.toUpperCase());
  const existing = existingIdx >= 0 ? members[existingIdx] : undefined;

  const record: MemberRecord = {
    cardNumber,
    name,
    phone,
    category: payload.category || 'Umum',
    cardDesign: existing?.cardDesign || getCardDesignLabel(payload.theme || 'teal-modern'),
    org: payload.org?.trim() || '-',
    address: payload.address?.trim() || '-',
    nik: existing?.nik || '',
    kkNumber: existing?.kkNumber || '',
    kkRelation: existing?.kkRelation || 'Kepala Keluarga',
    ktpAddress: existing?.ktpAddress || '',
    status: 'AKTIF',
    registeredAt: today,
    notes: 'Aktivasi Mandiri Otomatis',
  };

  const next = [...members];
  if (existingIdx >= 0) {
    next[existingIdx] = record;
  } else {
    next.unshift(record);
  }
  return { members: next, saved: record };
}

export interface DuplicatePhoneGroup {
  normalizedPhone: string;
  members: MemberRecord[];
}

export interface DuplicateCardGroup {
  normalizedCard: string;
  members: MemberRecord[];
}

export interface DuplicateAnalysisSummary {
  activeMembersCount: number;
  availableSlotsCount: number;
  duplicatePhoneGroups: DuplicatePhoneGroup[];
  duplicateCardGroups: DuplicateCardGroup[];
  blockedAttemptsTotal: number;
  blockedByCardCount: number;
  blockedByPhoneCount: number;
  blockedByDeviceCount: number;
  riskStatus: 'AMAN' | 'PERLU_TINJAU';
}

export function analyzeRegistrationDuplicates(
  members: MemberRecord[],
  duplicateLogs: DuplicateAttemptLog[]
): DuplicateAnalysisSummary {
  let activeMembersCount = 0;
  let availableSlotsCount = 0;
  const phoneGroups = new Map<string, MemberRecord[]>();
  const cardGroups = new Map<string, MemberRecord[]>();

  members.forEach((m) => {
    const normCard = normalizeCardNumber(m.cardNumber, 'FS');
    if (normCard) {
      const cList = cardGroups.get(normCard) || [];
      cList.push(m);
      cardGroups.set(normCard, cList);
    }

    if (m.status === 'AKTIF') {
      activeMembersCount++;
      const normPhone = normalizePhoneNumber(m.phone);
      if (normPhone.length >= 8) {
        const list = phoneGroups.get(normPhone) || [];
        list.push(m);
        phoneGroups.set(normPhone, list);
      }
    } else {
      availableSlotsCount++;
    }
  });

  const duplicatePhoneGroups: DuplicatePhoneGroup[] = [];
  phoneGroups.forEach((group, normalizedPhone) => {
    if (group.length > 1) {
      duplicatePhoneGroups.push({ normalizedPhone, members: group });
    }
  });

  const duplicateCardGroups: DuplicateCardGroup[] = [];
  cardGroups.forEach((group, normalizedCard) => {
    if (group.length > 1) {
      duplicateCardGroups.push({ normalizedCard, members: group });
    }
  });

  const blockedByCardCount = duplicateLogs.filter((l) => l.reason === 'CARD_ALREADY_ACTIVE').length;
  const blockedByPhoneCount = duplicateLogs.filter(
    (l) => l.reason === 'PHONE_ALREADY_REGISTERED'
  ).length;
  const blockedByDeviceCount = duplicateLogs.filter(
    (l) => l.reason === 'DEVICE_ALREADY_REGISTERED'
  ).length;

  return {
    activeMembersCount,
    availableSlotsCount,
    duplicatePhoneGroups,
    duplicateCardGroups,
    blockedAttemptsTotal: duplicateLogs.length,
    blockedByCardCount,
    blockedByPhoneCount,
    blockedByDeviceCount,
    riskStatus:
      duplicatePhoneGroups.length > 0 || duplicateCardGroups.length > 0 ? 'PERLU_TINJAU' : 'AMAN',
  };
}

export function applyAutoAccCard(
  members: MemberRecord[],
  rawCard: string,
  defaultPrefix = 'FS',
  theme: ThemeKey = 'teal-modern',
  registeredAt?: string
): { members: MemberRecord[]; activatedCard: string | null; alreadyActiveCard?: string } {
  const cleaned = rawCard.trim();
  if (!/^\d{4,}$/.test(cleaned) && !/^[A-Z0-9]+-\d{4,}$/i.test(cleaned)) {
    return { members, activatedCard: null };
  }
  const cardNumber = normalizeCardNumber(cleaned, defaultPrefix);
  const today =
    registeredAt ||
    new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const next = [...members];
  const idx = next.findIndex(
    (m) => normalizeCardNumber(m.cardNumber, defaultPrefix).toUpperCase() === cardNumber.toUpperCase()
  );
  if (idx >= 0) {
    if (next[idx].status === 'AKTIF') {
      return { members, activatedCard: null, alreadyActiveCard: next[idx].cardNumber };
    }
    next[idx] = {
      ...next[idx],
      status: 'AKTIF',
      registeredAt: !next[idx].registeredAt || next[idx].registeredAt === '-' ? today : next[idx].registeredAt,
    };
  } else {
    next.unshift({
      cardNumber,
      name: `Member ${cardNumber}`,
      phone: '-',
      category: 'Umum',
      cardDesign: getCardDesignLabel(theme),
      org: '-',
      address: '-',
      nik: '',
      kkNumber: '',
      kkRelation: 'Kepala Keluarga',
      ktpAddress: '',
      status: 'AKTIF',
      registeredAt: today,
      notes: 'Auto-ACC Admin',
    });
  }
  return { members: next, activatedCard: cardNumber };
}

export function generateBatchMemberSlots(
  members: MemberRecord[],
  options: {
    packageId: string;
    prefix: string;
    start: number;
    end: number;
    theme: ThemeKey;
  }
): { members: MemberRecord[]; createdCards: string[] } {
  const prefix = options.prefix.trim().toUpperCase() || 'FS';
  const start = Math.max(1, Math.floor(options.start) || 1);
  const end = Math.max(start, Math.floor(options.end) || start);
  const designLabel = getCardDesignLabel(options.theme);
  const createdCards: string[] = [];
  const next = [...members];

  for (let i = start; i <= end; i++) {
    const cardNumber = `${prefix}-${formatSerialDigits(i)}`;
    createdCards.push(cardNumber);
    const existingIdx = next.findIndex((m) => m.cardNumber.toUpperCase() === cardNumber);
    if (existingIdx >= 0) {
      next[existingIdx] = {
        ...next[existingIdx],
        category: options.packageId,
        cardDesign: designLabel,
      };
    } else {
      next.push({
        cardNumber,
        name: 'Slot Kartu Belum Terisi',
        phone: '-',
        category: options.packageId,
        cardDesign: designLabel,
        org: '-',
        address: '-',
        nik: '',
        kkNumber: '',
        kkRelation: 'Kepala Keluarga',
        ktpAddress: '',
        status: 'BELUM_AKTIF',
        registeredAt: '-',
        notes: `Batch Cetak (${designLabel})`,
      });
    }
  }

  return { members: next, createdCards };
}

export function processAttendanceCheckInRecord(
  members: MemberRecord[],
  logs: AttendanceLog[],
  rawInput: string,
  purpose: string,
  defaultPrefix = 'FS',
  now = new Date()
): {
  status: 'ok' | 'not_found' | 'inactive' | 'empty';
  cardNumber: string;
  member?: MemberRecord;
  log?: AttendanceLog;
  logs: AttendanceLog[];
} {
  const cardNo = extractCardNumberFromScan(rawInput, defaultPrefix);
  if (!cardNo) return { status: 'empty', cardNumber: '', logs };

  const member = members.find((m) => m.cardNumber.toUpperCase() === cardNo.toUpperCase());
  if (!member) {
    return { status: 'not_found', cardNumber: cardNo, logs };
  }
  if (member.status !== 'AKTIF') {
    return { status: 'inactive', cardNumber: member.cardNumber, member, logs };
  }

  const isoDate = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const log: AttendanceLog = {
    id: `ATT-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    dateKey: isoDate,
    timestamp: timeStr,
    isoTimestamp: now.toISOString(),
    hour: now.getHours(),
    cardNumber: member.cardNumber,
    name: member.name,
    category: member.category || 'Umum',
    phone: member.phone || '-',
    purpose,
  };

  return {
    status: 'ok',
    cardNumber: member.cardNumber,
    member,
    log,
    logs: [log, ...logs],
  };
}

export interface DailyCheckInPoint {
  dateKey: string;
  dayLabel: string;
  fullDate: string;
  count: number;
  peakHourLabel: string;
  isToday: boolean;
}

export interface HourlyPeakPoint {
  hour: number;
  hourLabel: string;
  count: number;
  isPeak: boolean;
}

export interface CategoryDistributionPoint {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MonthlyTrendPoint {
  monthKey: string;
  monthLabel: string;
  fullMonth: string;
  count: number;
  uniqueMembers: number;
  isCurrentMonth: boolean;
}

export interface AttendanceDashboardSummary {
  dailyPoints: DailyCheckInPoint[];
  hourlyPoints: HourlyPeakPoint[];
  categoryPoints: CategoryDistributionPoint[];
  monthlyPoints: MonthlyTrendPoint[];
  last7DaysTotal: number;
  dailyAverage: number;
  peakDayLabel: string;
  peakDayCount: number;
  peakHourLabel: string;
  peakHourCount: number;
  topCategoryLabel: string;
  topCategoryCount: number;
  topCategoryShare: number;
  currentMonthCount: number;
  peakMonthLabel: string;
  peakMonthCount: number;
}

const CATEGORY_CHART_COLORS: Record<string, string> = {
  Exclusive: '#d97706',
  Wisudawan: '#4338ca',
  VIP: '#047857',
  Umum: '#0e7490',
  Mahasiswa: '#0284c7',
};

const FALLBACK_CHART_COLORS = [
  '#0e7490',
  '#4338ca',
  '#047857',
  '#d97706',
  '#0284c7',
  '#475569',
];

export function extractLogHour(log: AttendanceLog): number | null {
  if (typeof log.hour === 'number' && Number.isInteger(log.hour) && log.hour >= 0 && log.hour <= 23) {
    return log.hour;
  }
  if (log.isoTimestamp) {
    const d = new Date(log.isoTimestamp);
    if (!Number.isNaN(d.getTime())) {
      return d.getHours();
    }
  }
  const timeMatch = String(log.timestamp || '').match(/(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?(?:\s*(AM|PM))?/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const meridiem = timeMatch[3]?.toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    if (h >= 0 && h <= 23) return h;
  }
  return null;
}

export function formatHourRange(hour: number): string {
  const start = String(hour).padStart(2, '0');
  return `${start}:00`;
}

export function buildLast7DaysCheckInStats(
  logs: AttendanceLog[],
  referenceDate = new Date()
): DailyCheckInPoint[] {
  const byDate = new Map<string, AttendanceLog[]>();
  logs.forEach((log) => {
    const list = byDate.get(log.dateKey) || [];
    list.push(log);
    byDate.set(log.dateKey, list);
  });

  const baseUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );

  const points: DailyCheckInPoint[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const dayDate = new Date(baseUtc - offset * 86400000);
    const dateKey = dayDate.toISOString().slice(0, 10);
    const dayLogs = byDate.get(dateKey) || [];
    const hourCounts = new Map<number, number>();
    dayLogs.forEach((l) => {
      const h = extractLogHour(l);
      if (h !== null) {
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      }
    });

    let topHour: number | null = null;
    let topHourCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > topHourCount) {
        topHour = hour;
        topHourCount = count;
      }
    });

    const weekday = dayDate.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' });
    const dayNum = String(dayDate.getUTCDate()).padStart(2, '0');
    const fullDate = dayDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

    points.push({
      dateKey,
      dayLabel: offset === 0 ? `Hari Ini` : `${weekday} ${dayNum}`,
      fullDate,
      count: dayLogs.length,
      peakHourLabel: topHour !== null ? `${formatHourRange(topHour)} (${topHourCount}x)` : 'Belum ada data',
      isToday: offset === 0,
    });
  }

  return points;
}

export function buildHourlyPeakStats(
  logs: AttendanceLog[],
  dateKeysFilter?: Set<string>
): HourlyPeakPoint[] {
  const scopedLogs = dateKeysFilter
    ? logs.filter((l) => dateKeysFilter.has(l.dateKey))
    : logs;
  const counts = new Map<number, number>();
  let minHour = 8;
  let maxHour = 21;

  scopedLogs.forEach((log) => {
    const h = extractLogHour(log);
    if (h === null) return;
    counts.set(h, (counts.get(h) || 0) + 1);
    if (h < minHour) minHour = h;
    if (h > maxHour) maxHour = h;
  });

  let peakCount = 0;
  counts.forEach((c) => {
    if (c > peakCount) peakCount = c;
  });

  const points: HourlyPeakPoint[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    const count = counts.get(h) || 0;
    points.push({
      hour: h,
      hourLabel: formatHourRange(h),
      count,
      isPeak: peakCount > 0 && count === peakCount,
    });
  }
  return points;
}

export function buildCategoryVisitDistribution(
  logs: AttendanceLog[]
): CategoryDistributionPoint[] {
  if (logs.length === 0) return [];

  const counts = new Map<string, number>();
  logs.forEach((log) => {
    const rawCat = String(log.category || '').trim() || 'Umum';
    counts.set(rawCat, (counts.get(rawCat) || 0) + 1);
  });

  const total = logs.length;
  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  return sorted.map(([category, count], idx) => ({
    category,
    count,
    percentage: Math.round((count / total) * 1000) / 10,
    color:
      CATEGORY_CHART_COLORS[category] ||
      FALLBACK_CHART_COLORS[idx % FALLBACK_CHART_COLORS.length],
  }));
}

export function buildMonthlyVisitTrend(
  logs: AttendanceLog[],
  monthsCount = 6,
  referenceDate = new Date()
): MonthlyTrendPoint[] {
  const safeCount = Math.max(1, Math.floor(monthsCount) || 6);
  const byMonth = new Map<string, { count: number; cards: Set<string> }>();

  logs.forEach((log) => {
    const monthKey = String(log.dateKey || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return;
    const entry = byMonth.get(monthKey) || { count: 0, cards: new Set<string>() };
    entry.count += 1;
    if (log.cardNumber) entry.cards.add(log.cardNumber);
    byMonth.set(monthKey, entry);
  });

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  const points: MonthlyTrendPoint[] = [];
  for (let offset = safeCount - 1; offset >= 0; offset--) {
    const monthDate = new Date(Date.UTC(refYear, refMonth - offset, 1));
    const y = monthDate.getUTCFullYear();
    const m = String(monthDate.getUTCMonth() + 1).padStart(2, '0');
    const monthKey = `${y}-${m}`;
    const shortMonth = monthDate.toLocaleDateString('id-ID', {
      month: 'short',
      timeZone: 'UTC',
    });
    const fullMonth = monthDate.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const stats = byMonth.get(monthKey);

    points.push({
      monthKey,
      monthLabel: `${shortMonth} '${String(y).slice(-2)}`,
      fullMonth,
      count: stats ? stats.count : 0,
      uniqueMembers: stats ? stats.cards.size : 0,
      isCurrentMonth: offset === 0,
    });
  }

  return points;
}

export function buildAttendanceDashboardSummary(
  logs: AttendanceLog[],
  referenceDate = new Date()
): AttendanceDashboardSummary {
  const dailyPoints = buildLast7DaysCheckInStats(logs, referenceDate);
  const last7Keys = new Set(dailyPoints.map((d) => d.dateKey));
  const hourlyPoints = buildHourlyPeakStats(logs, last7Keys);
  const categoryPoints = buildCategoryVisitDistribution(logs);
  const monthlyPoints = buildMonthlyVisitTrend(logs, 6, referenceDate);

  const last7DaysTotal = dailyPoints.reduce((acc, d) => acc + d.count, 0);
  const dailyAverage = Math.round((last7DaysTotal / 7) * 10) / 10;

  let peakDay = dailyPoints[0];
  dailyPoints.forEach((d) => {
    if (d.count > peakDay.count) peakDay = d;
  });

  let peakHour = hourlyPoints[0];
  hourlyPoints.forEach((h) => {
    if (h.count > peakHour.count) peakHour = h;
  });

  const topCategory = categoryPoints[0];
  const currentMonthPoint = monthlyPoints[monthlyPoints.length - 1];
  let peakMonth = monthlyPoints[0];
  monthlyPoints.forEach((m) => {
    if (m.count > peakMonth.count) peakMonth = m;
  });

  return {
    dailyPoints,
    hourlyPoints,
    categoryPoints,
    monthlyPoints,
    last7DaysTotal,
    dailyAverage,
    peakDayLabel: peakDay && peakDay.count > 0 ? peakDay.dayLabel : '-',
    peakDayCount: peakDay ? peakDay.count : 0,
    peakHourLabel: peakHour && peakHour.count > 0 ? peakHour.hourLabel : '-',
    peakHourCount: peakHour ? peakHour.count : 0,
    topCategoryLabel: topCategory ? topCategory.category : '-',
    topCategoryCount: topCategory ? topCategory.count : 0,
    topCategoryShare: topCategory ? topCategory.percentage : 0,
    currentMonthCount: currentMonthPoint ? currentMonthPoint.count : 0,
    peakMonthLabel: peakMonth && peakMonth.count > 0 ? peakMonth.fullMonth : '-',
    peakMonthCount: peakMonth ? peakMonth.count : 0,
  };
}

export type DateRangePreset = '7d' | '30d' | 'month' | 'last-month' | '6m' | 'custom';

export interface RangePeriodPoint {
  periodKey: string;
  label: string;
  fullLabel: string;
  count: number;
  uniqueMembers: number;
  peakHourLabel: string;
  isHighlighted: boolean;
}

export interface FilteredAttendanceDashboardSummary {
  startDate: string;
  endDate: string;
  daySpan: number;
  rangeLabel: string;
  granularity: 'day' | 'week' | 'month';
  filteredLogs: AttendanceLog[];
  periodPoints: RangePeriodPoint[];
  hourlyPoints: HourlyPeakPoint[];
  categoryPoints: CategoryDistributionPoint[];
  totalCount: number;
  uniqueMembersCount: number;
  dailyAverage: number;
  peakPeriodLabel: string;
  peakPeriodCount: number;
  peakHourLabel: string;
  peakHourCount: number;
  topCategoryLabel: string;
  topCategoryCount: number;
  topCategoryShare: number;
}

export function formatUtcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKeyUtc(dateKey: string): Date | null {
  const match = String(dateKey || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
}

export function resolveAttendanceDatePreset(
  preset: Exclude<DateRangePreset, 'custom'>,
  referenceDate = new Date()
): { startDate: string; endDate: string } {
  const todayUtc = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const endDate = formatUtcDateKey(todayUtc);

  if (preset === '7d') {
    const start = new Date(todayUtc.getTime() - 6 * 86400000);
    return { startDate: formatUtcDateKey(start), endDate };
  }
  if (preset === '30d') {
    const start = new Date(todayUtc.getTime() - 29 * 86400000);
    return { startDate: formatUtcDateKey(start), endDate };
  }
  if (preset === 'month') {
    const start = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1));
    return { startDate: formatUtcDateKey(start), endDate };
  }
  if (preset === 'last-month') {
    const start = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 0));
    return { startDate: formatUtcDateKey(start), endDate: formatUtcDateKey(end) };
  }
  const sixMonthsStart = new Date(
    Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - 5, 1)
  );
  return { startDate: formatUtcDateKey(sixMonthsStart), endDate };
}

export function normalizeDateRange(
  rawStartDate: string,
  rawEndDate: string,
  referenceDate = new Date()
): {
  startDate: string;
  endDate: string;
  startUtc: Date;
  endUtc: Date;
  daySpan: number;
  wasSwapped: boolean;
} {
  const fallback = resolveAttendanceDatePreset('7d', referenceDate);
  const parsedStart = parseDateKeyUtc(rawStartDate) || parseDateKeyUtc(fallback.startDate)!;
  const parsedEnd = parseDateKeyUtc(rawEndDate) || parseDateKeyUtc(fallback.endDate)!;

  if (parsedStart.getTime() > parsedEnd.getTime()) {
    const daySpan = Math.floor((parsedStart.getTime() - parsedEnd.getTime()) / 86400000) + 1;
    return {
      startDate: formatUtcDateKey(parsedEnd),
      endDate: formatUtcDateKey(parsedStart),
      startUtc: parsedEnd,
      endUtc: parsedStart,
      daySpan,
      wasSwapped: true,
    };
  }

  const daySpan = Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 86400000) + 1;
  return {
    startDate: formatUtcDateKey(parsedStart),
    endDate: formatUtcDateKey(parsedEnd),
    startUtc: parsedStart,
    endUtc: parsedEnd,
    daySpan,
    wasSwapped: false,
  };
}

export function filterAttendanceLogsByDateRange(
  logs: AttendanceLog[],
  startDate: string,
  endDate: string,
  referenceDate = new Date()
): AttendanceLog[] {
  const norm = normalizeDateRange(startDate, endDate, referenceDate);
  return logs.filter((log) => {
    const key = String(log.dateKey || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    return key >= norm.startDate && key <= norm.endDate;
  });
}

function summarizeBucketPeakHour(bucketLogs: AttendanceLog[]): string {
  const hourCounts = new Map<number, number>();
  bucketLogs.forEach((l) => {
    const h = extractLogHour(l);
    if (h !== null) {
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    }
  });
  let topHour: number | null = null;
  let topCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > topCount) {
      topHour = hour;
      topCount = count;
    }
  });
  return topHour !== null ? `${formatHourRange(topHour)} (${topCount}x)` : 'Belum ada data';
}

export function buildRangePeriodStats(
  scopedLogs: AttendanceLog[],
  startDate: string,
  endDate: string,
  referenceDate = new Date()
): { granularity: 'day' | 'week' | 'month'; points: RangePeriodPoint[]; daySpan: number } {
  const norm = normalizeDateRange(startDate, endDate, referenceDate);
  const todayKey = formatUtcDateKey(referenceDate);

  if (norm.daySpan <= 45) {
    const byDate = new Map<string, AttendanceLog[]>();
    scopedLogs.forEach((log) => {
      const list = byDate.get(log.dateKey) || [];
      list.push(log);
      byDate.set(log.dateKey, list);
    });

    const points: RangePeriodPoint[] = [];
    for (let offset = 0; offset < norm.daySpan; offset++) {
      const dayDate = new Date(norm.startUtc.getTime() + offset * 86400000);
      const dateKey = formatUtcDateKey(dayDate);
      const dayLogs = byDate.get(dateKey) || [];
      const uniqueCards = new Set(dayLogs.map((l) => l.cardNumber).filter(Boolean));
      const dayNum = String(dayDate.getUTCDate()).padStart(2, '0');
      const shortMonth = dayDate.toLocaleDateString('id-ID', {
        month: 'short',
        timeZone: 'UTC',
      });
      const weekday = dayDate.toLocaleDateString('id-ID', {
        weekday: 'short',
        timeZone: 'UTC',
      });
      const fullLabel = dayDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });

      const isToday = dateKey === todayKey;
      const label =
        norm.daySpan <= 10
          ? isToday
            ? 'Hari Ini'
            : `${weekday} ${dayNum}`
          : `${dayNum} ${shortMonth}`;

      points.push({
        periodKey: dateKey,
        label,
        fullLabel,
        count: dayLogs.length,
        uniqueMembers: uniqueCards.size,
        peakHourLabel: summarizeBucketPeakHour(dayLogs),
        isHighlighted: isToday,
      });
    }
    return { granularity: 'day', points, daySpan: norm.daySpan };
  }

  if (norm.daySpan <= 120) {
    const points: RangePeriodPoint[] = [];
    let cursorMs = norm.startUtc.getTime();
    const endMs = norm.endUtc.getTime();
    let weekIdx = 1;

    while (cursorMs <= endMs) {
      const bucketEndMs = Math.min(endMs, cursorMs + 6 * 86400000);
      const bucketStart = new Date(cursorMs);
      const bucketEnd = new Date(bucketEndMs);
      const bucketStartKey = formatUtcDateKey(bucketStart);
      const bucketEndKey = formatUtcDateKey(bucketEnd);

      const bucketLogs = scopedLogs.filter(
        (l) => l.dateKey >= bucketStartKey && l.dateKey <= bucketEndKey
      );
      const uniqueCards = new Set(bucketLogs.map((l) => l.cardNumber).filter(Boolean));

      const startShort = bucketStart.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      });
      const endShort = bucketEnd.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });

      points.push({
        periodKey: `${bucketStartKey}_${bucketEndKey}`,
        label: `Mgg ${weekIdx} (${startShort})`,
        fullLabel: `Minggu ${weekIdx}: ${startShort} – ${endShort}`,
        count: bucketLogs.length,
        uniqueMembers: uniqueCards.size,
        peakHourLabel: summarizeBucketPeakHour(bucketLogs),
        isHighlighted: todayKey >= bucketStartKey && todayKey <= bucketEndKey,
      });

      cursorMs = bucketEndMs + 86400000;
      weekIdx++;
    }
    return { granularity: 'week', points, daySpan: norm.daySpan };
  }

  const startYear = norm.startUtc.getUTCFullYear();
  const startMonth = norm.startUtc.getUTCMonth();
  const endYear = norm.endUtc.getUTCFullYear();
  const endMonth = norm.endUtc.getUTCMonth();
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  const currentMonthKey = todayKey.slice(0, 7);

  const byMonth = new Map<string, AttendanceLog[]>();
  scopedLogs.forEach((log) => {
    const mKey = String(log.dateKey || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mKey)) return;
    const list = byMonth.get(mKey) || [];
    list.push(log);
    byMonth.set(mKey, list);
  });

  const points: RangePeriodPoint[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const monthDate = new Date(Date.UTC(startYear, startMonth + i, 1));
    const y = monthDate.getUTCFullYear();
    const m = String(monthDate.getUTCMonth() + 1).padStart(2, '0');
    const monthKey = `${y}-${m}`;
    const monthLogs = byMonth.get(monthKey) || [];
    const uniqueCards = new Set(monthLogs.map((l) => l.cardNumber).filter(Boolean));
    const shortMonth = monthDate.toLocaleDateString('id-ID', {
      month: 'short',
      timeZone: 'UTC',
    });
    const fullMonth = monthDate.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    points.push({
      periodKey: monthKey,
      label: `${shortMonth} '${String(y).slice(-2)}`,
      fullLabel: fullMonth,
      count: monthLogs.length,
      uniqueMembers: uniqueCards.size,
      peakHourLabel: summarizeBucketPeakHour(monthLogs),
      isHighlighted: monthKey === currentMonthKey,
    });
  }

  return { granularity: 'month', points, daySpan: norm.daySpan };
}

export function buildFilteredAttendanceDashboardSummary(
  logs: AttendanceLog[],
  rawStartDate: string,
  rawEndDate: string,
  referenceDate = new Date()
): FilteredAttendanceDashboardSummary {
  const norm = normalizeDateRange(rawStartDate, rawEndDate, referenceDate);
  const filteredLogs = filterAttendanceLogsByDateRange(
    logs,
    norm.startDate,
    norm.endDate,
    referenceDate
  );

  const { granularity, points: periodPoints, daySpan } = buildRangePeriodStats(
    filteredLogs,
    norm.startDate,
    norm.endDate,
    referenceDate
  );
  const hourlyPoints = buildHourlyPeakStats(filteredLogs);
  const categoryPoints = buildCategoryVisitDistribution(filteredLogs);

  const totalCount = filteredLogs.length;
  const uniqueMembersCount = new Set(
    filteredLogs.map((l) => l.cardNumber).filter(Boolean)
  ).size;
  const dailyAverage = Math.round((totalCount / Math.max(1, daySpan)) * 10) / 10;

  let peakPeriod = periodPoints[0];
  periodPoints.forEach((p) => {
    if (p.count > peakPeriod.count) peakPeriod = p;
  });

  let peakHour = hourlyPoints[0];
  hourlyPoints.forEach((h) => {
    if (h.count > peakHour.count) peakHour = h;
  });

  const topCategory = categoryPoints[0];

  const startFormatted = norm.startUtc.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const endFormatted = norm.endUtc.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return {
    startDate: norm.startDate,
    endDate: norm.endDate,
    daySpan,
    rangeLabel: `${startFormatted} – ${endFormatted} (${daySpan} hari)`,
    granularity,
    filteredLogs,
    periodPoints,
    hourlyPoints,
    categoryPoints,
    totalCount,
    uniqueMembersCount,
    dailyAverage,
    peakPeriodLabel: peakPeriod && peakPeriod.count > 0 ? peakPeriod.label : '-',
    peakPeriodCount: peakPeriod ? peakPeriod.count : 0,
    peakHourLabel: peakHour && peakHour.count > 0 ? peakHour.hourLabel : '-',
    peakHourCount: peakHour ? peakHour.count : 0,
    topCategoryLabel: topCategory ? topCategory.category : '-',
    topCategoryCount: topCategory ? topCategory.count : 0,
    topCategoryShare: topCategory ? topCategory.percentage : 0,
  };
}

export function seedInitialAttendanceLogs(referenceDate = new Date()): AttendanceLog[] {
  const baseUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );

  const sampleSchedule: Array<{
    daysAgo: number;
    hours: number[];
  }> = [
    { daysAgo: 6, hours: [10, 14] },
    { daysAgo: 5, hours: [11, 14, 15, 19] },
    { daysAgo: 4, hours: [13, 14, 17] },
    { daysAgo: 3, hours: [10, 14, 15, 16, 19] },
    { daysAgo: 2, hours: [11, 16, 18] },
    { daysAgo: 1, hours: [9, 14, 14, 16, 17, 20] },
  ];

  const sampleMembers = [
    { cardNumber: 'FS-0001', name: 'Andi Muhammad Farid', category: 'Exclusive', phone: '085241483041' },
    { cardNumber: 'FS-0002', name: 'Siti Nurhaliza Putri', category: 'Wisudawan', phone: '081342998877' },
    { cardNumber: 'VIP-0003', name: 'Rina Kusuma', category: 'VIP', phone: '081244556677' },
    { cardNumber: 'FS-0004', name: 'Budi Pratama', category: 'Umum', phone: '082133445566' },
    { cardNumber: 'MHS-0005', name: 'Aulia Rahman', category: 'Mahasiswa', phone: '085322110099' },
  ];
  const samplePurposes = [
    'Sesi Foto Studio',
    'Foto Wisuda / Keluarga',
    'Cetak Foto / Bingkai',
    'Klaim Diskon / Benefit Member',
  ];

  const logs: AttendanceLog[] = [];
  let seq = 1;

  for (let i = sampleSchedule.length - 1; i >= 0; i--) {
    const entry = sampleSchedule[i];
    const dayDate = new Date(baseUtc - entry.daysAgo * 86400000);
    const dateKey = dayDate.toISOString().slice(0, 10);

    for (let j = entry.hours.length - 1; j >= 0; j--) {
      const hour = entry.hours[j];
      const member = sampleMembers[(seq + j) % sampleMembers.length];
      const purpose = samplePurposes[(seq + j) % samplePurposes.length];
      const dateStr = dayDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
      const minute = String((j * 15) % 60).padStart(2, '0');
      const hourStr = String(hour).padStart(2, '0');
      const isoDate = new Date(
        dayDate.getUTCFullYear(),
        dayDate.getUTCMonth(),
        dayDate.getUTCDate(),
        hour,
        (j * 15) % 60,
        0
      );

      logs.push({
        id: `SEED-ATT-${dateKey}-${seq}`,
        dateKey,
        timestamp: `${dateStr}, ${hourStr}.${minute}.00`,
        isoTimestamp: isoDate.toISOString(),
        hour,
        cardNumber: member.cardNumber,
        name: member.name,
        category: member.category,
        phone: member.phone,
        purpose,
      });
      seq++;
    }
  }

  // Historical monthly visits (> 7 days ago) to power the multi-month trend & category analytics
  const monthlyHistorySpecs: Array<{
    monthsAgo: number;
    dayOfMonth: number;
    visits: Array<{ categoryIdx: number; hour: number; purposeIdx: number }>;
  }> = [
    {
      monthsAgo: 5,
      dayOfMonth: 12,
      visits: [
        { categoryIdx: 3, hour: 11, purposeIdx: 0 },
        { categoryIdx: 4, hour: 14, purposeIdx: 2 },
        { categoryIdx: 1, hour: 15, purposeIdx: 1 },
        { categoryIdx: 3, hour: 16, purposeIdx: 0 },
        { categoryIdx: 2, hour: 17, purposeIdx: 3 },
        { categoryIdx: 4, hour: 18, purposeIdx: 2 },
      ],
    },
    {
      monthsAgo: 4,
      dayOfMonth: 15,
      visits: [
        { categoryIdx: 1, hour: 10, purposeIdx: 1 },
        { categoryIdx: 1, hour: 13, purposeIdx: 1 },
        { categoryIdx: 3, hour: 14, purposeIdx: 0 },
        { categoryIdx: 4, hour: 15, purposeIdx: 2 },
        { categoryIdx: 0, hour: 16, purposeIdx: 3 },
        { categoryIdx: 2, hour: 17, purposeIdx: 0 },
        { categoryIdx: 1, hour: 18, purposeIdx: 1 },
        { categoryIdx: 3, hour: 19, purposeIdx: 2 },
        { categoryIdx: 4, hour: 19, purposeIdx: 0 },
      ],
    },
    {
      monthsAgo: 3,
      dayOfMonth: 14,
      visits: [
        { categoryIdx: 1, hour: 10, purposeIdx: 1 },
        { categoryIdx: 1, hour: 11, purposeIdx: 1 },
        { categoryIdx: 2, hour: 13, purposeIdx: 0 },
        { categoryIdx: 3, hour: 14, purposeIdx: 2 },
        { categoryIdx: 1, hour: 14, purposeIdx: 1 },
        { categoryIdx: 0, hour: 15, purposeIdx: 3 },
        { categoryIdx: 4, hour: 16, purposeIdx: 2 },
        { categoryIdx: 1, hour: 17, purposeIdx: 1 },
        { categoryIdx: 2, hour: 18, purposeIdx: 0 },
        { categoryIdx: 3, hour: 19, purposeIdx: 3 },
        { categoryIdx: 1, hour: 19, purposeIdx: 1 },
        { categoryIdx: 4, hour: 20, purposeIdx: 2 },
      ],
    },
    {
      monthsAgo: 2,
      dayOfMonth: 16,
      visits: [
        { categoryIdx: 2, hour: 10, purposeIdx: 0 },
        { categoryIdx: 3, hour: 11, purposeIdx: 2 },
        { categoryIdx: 1, hour: 13, purposeIdx: 1 },
        { categoryIdx: 4, hour: 14, purposeIdx: 2 },
        { categoryIdx: 0, hour: 15, purposeIdx: 3 },
        { categoryIdx: 2, hour: 16, purposeIdx: 0 },
        { categoryIdx: 3, hour: 17, purposeIdx: 2 },
        { categoryIdx: 1, hour: 18, purposeIdx: 1 },
        { categoryIdx: 0, hour: 19, purposeIdx: 3 },
        { categoryIdx: 2, hour: 20, purposeIdx: 0 },
      ],
    },
    {
      monthsAgo: 1,
      dayOfMonth: 18,
      visits: [
        { categoryIdx: 1, hour: 9, purposeIdx: 1 },
        { categoryIdx: 1, hour: 10, purposeIdx: 1 },
        { categoryIdx: 2, hour: 11, purposeIdx: 0 },
        { categoryIdx: 0, hour: 13, purposeIdx: 3 },
        { categoryIdx: 1, hour: 14, purposeIdx: 1 },
        { categoryIdx: 3, hour: 14, purposeIdx: 2 },
        { categoryIdx: 2, hour: 15, purposeIdx: 0 },
        { categoryIdx: 4, hour: 15, purposeIdx: 2 },
        { categoryIdx: 1, hour: 16, purposeIdx: 1 },
        { categoryIdx: 0, hour: 17, purposeIdx: 3 },
        { categoryIdx: 2, hour: 17, purposeIdx: 0 },
        { categoryIdx: 1, hour: 18, purposeIdx: 1 },
        { categoryIdx: 3, hour: 19, purposeIdx: 2 },
        { categoryIdx: 0, hour: 19, purposeIdx: 3 },
        { categoryIdx: 1, hour: 20, purposeIdx: 1 },
      ],
    },
  ];

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  for (let mIdx = monthlyHistorySpecs.length - 1; mIdx >= 0; mIdx--) {
    const spec = monthlyHistorySpecs[mIdx];
    const histDate = new Date(Date.UTC(refYear, refMonth - spec.monthsAgo, spec.dayOfMonth));
    const dateKey = histDate.toISOString().slice(0, 10);
    const dateStr = histDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

    spec.visits.forEach((v, idx) => {
      const member = sampleMembers[v.categoryIdx % sampleMembers.length];
      const purpose = samplePurposes[v.purposeIdx % samplePurposes.length];
      const hourStr = String(v.hour).padStart(2, '0');
      const minute = String((idx * 10) % 60).padStart(2, '0');
      const isoDate = new Date(
        histDate.getUTCFullYear(),
        histDate.getUTCMonth(),
        histDate.getUTCDate(),
        v.hour,
        (idx * 10) % 60,
        0
      );

      logs.push({
        id: `SEED-HIST-${dateKey}-${seq}`,
        dateKey,
        timestamp: `${dateStr}, ${hourStr}.${minute}.00`,
        isoTimestamp: isoDate.toISOString(),
        hour: v.hour,
        cardNumber: member.cardNumber,
        name: member.name,
        category: member.category,
        phone: member.phone,
        purpose,
      });
      seq++;
    });
  }

  return logs;
}

export function mapMembersForExcelExport(members: MemberRecord[], defaultTheme: ThemeKey) {
  return members.map((m, idx) => ({
    No: idx + 1,
    'Nomor Kartu': m.cardNumber,
    'Nama Lengkap': m.name,
    'No. WhatsApp': m.phone || '-',
    'Paket Member': m.category || 'Umum',
    'Jenis Desain Kartu': m.cardDesign || getCardDesignLabel(defaultTheme),
    'Instansi / Kampus': m.org || '-',
    'NIK KTP': m.nik || '',
    'Nomor KK': m.kkNumber || '',
    Status: m.status,
    'Tanggal Aktif': m.registeredAt || '-',
    Catatan: m.notes || '',
  }));
}

export function parseImportedExcelRows(
  members: MemberRecord[],
  rows: Record<string, unknown>[],
  defaultPrefix = 'FS',
  defaultTheme: ThemeKey = 'teal-modern'
): { members: MemberRecord[]; importedCount: number } {
  const next = [...members];
  let importedCount = 0;

  rows.forEach((row) => {
    const rawCard = row['Nomor Kartu'] || row['No. Kartu'] || row['cardNumber'];
    if (!rawCard) return;
    const cardNumber = normalizeCardNumber(String(rawCard), defaultPrefix);
    const record: MemberRecord = {
      cardNumber,
      name: String(row['Nama Lengkap'] || row['Nama'] || 'Member Import'),
      phone: String(row['No. WhatsApp'] || row['WhatsApp'] || '-'),
      category: String(row['Paket Member'] || row['Paket'] || 'Umum'),
      cardDesign: String(row['Jenis Desain Kartu'] || getCardDesignLabel(defaultTheme)),
      org: String(row['Instansi / Kampus'] || '-'),
      address: String(row['Alamat'] || '-'),
      nik: String(row['NIK KTP'] || ''),
      kkNumber: String(row['Nomor KK'] || ''),
      kkRelation: 'Kepala Keluarga',
      ktpAddress: '',
      status: String(row['Status'] || 'AKTIF').toUpperCase() === 'AKTIF' ? 'AKTIF' : 'BELUM_AKTIF',
      registeredAt: String(row['Tanggal Aktif'] || new Date().toLocaleDateString('id-ID')),
      notes: String(row['Catatan'] || 'Import Excel'),
    };
    const idx = next.findIndex((m) => m.cardNumber.toUpperCase() === cardNumber.toUpperCase());
    if (idx >= 0) next[idx] = record;
    else next.push(record);
    importedCount++;
  });

  return { members: next, importedCount };
}
