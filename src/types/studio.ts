export type AppTab =
  | 'mass-qr'
  | 'register'
  | 'portal'
  | 'admin'
  | 'design'
  | 'excel'
  | 'attendance';

export type ThemeKey =
  | 'teal-modern'
  | 'studio-geometric'
  | 'photo-studio-pro'
  | 'exclusive-vip'
  | 'royal-navy'
  | 'emerald-prestige'
  | 'pearl-minimal';

export type MemberStatus = 'AKTIF' | 'BELUM_AKTIF';

export interface MemberRecord {
  cardNumber: string;
  name: string;
  phone: string;
  category: string;
  cardDesign: string;
  org: string;
  address: string;
  nik: string;
  kkNumber: string;
  kkRelation: string;
  ktpAddress: string;
  status: MemberStatus;
  registeredAt: string;
  notes: string;
}

export interface PackageConfig {
  id: string;
  prefix: string;
  cardLabel: string;
  name: string;
  price: number;
  duration: string;
  badge: string;
  color: string;
  benefits: string;
}

export interface CardDesignConfig {
  theme: ThemeKey;
  brandTitle: string;
  phoneText: string;
  primaryColor: string;
  accentColor: string;
  darkColor: string;
  titleSize: number;
  qrSize: number;
  badgeLabel: string;
  serialPrefix: string;
  packageDisplay: string;
  cardCaption: string;
  qrLabel: string;
  backTitle: string;
  instagram: string;
  hashtag: string;
  addressMain: string;
  addressBranch: string;
}

export interface AttendanceLog {
  id: string;
  dateKey: string;
  timestamp: string;
  isoTimestamp?: string;
  hour?: number;
  cardNumber: string;
  name: string;
  category: string;
  phone: string;
  purpose: string;
}

export interface SecurityLog {
  ts: string;
  action: string;
  level: 'INFO' | 'WARN' | 'ALERT';
}

export type DuplicateReason =
  | 'CARD_ALREADY_ACTIVE'
  | 'PHONE_ALREADY_REGISTERED'
  | 'DEVICE_ALREADY_REGISTERED'
  | 'INVALID_PHONE';

export interface DuplicateAttemptLog {
  id: string;
  ts: string;
  reason: 'CARD_ALREADY_ACTIVE' | 'PHONE_ALREADY_REGISTERED' | 'DEVICE_ALREADY_REGISTERED';
  cardNumber: string;
  attemptedName: string;
  attemptedPhone: string;
  matchedCardNumber: string;
  matchedName: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface StudioBranchLocation {
  id: 'utama' | 'cabang';
  title: string;
  subtitle: string;
  address: string;
  hours: string;
  position: { lat: number; lng: number };
  mapsUrl: string;
}

export interface WaMessageTemplate {
  id: string;
  name: string;
  body: string;
}

export type WaDeliveryStatus = 'TERKIRIM' | 'SIAP_KIRIM' | 'GAGAL';

export interface WaDeliveryLog {
  id: string;
  timestamp: string;
  cardNumber: string;
  memberName: string;
  phone: string;
  triggerType: 'BULK' | 'AUTO_AKTIF' | 'AUTO_CHECKIN' | 'RETRY';
  templateName: string;
  message: string;
  waUrl: string;
  status: WaDeliveryStatus;
  errorReason?: string;
}

export interface WaAutoReplySettings {
  onActivated: boolean;
  onCheckIn: boolean;
  activatedTemplateId: string;
  checkInTemplateId: string;
}

export interface EncryptedBackupEnvelope {
  app: 'farid-studio-multimedia';
  version: number;
  encrypted: true;
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
  createdAt: string;
}

