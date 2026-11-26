import type {
  AttendanceLog,
  CardDesignConfig,
  DuplicateAttemptLog,
  EncryptedBackupEnvelope,
  MemberRecord,
  PackageConfig,
  SecurityLog,
  StudioBranchLocation,
  WaAutoReplySettings,
  WaDeliveryLog,
  WaMessageTemplate,
} from '../types/studio';

export interface StudioBackupPayload {
  exportedAt: string;
  members: MemberRecord[];
  packages: PackageConfig[];
  design: CardDesignConfig;
  attendanceLogs: AttendanceLog[];
  securityLogs: SecurityLog[];
  duplicateLogs: DuplicateAttemptLog[];
  studioBranches: StudioBranchLocation[];
  waTemplates: WaMessageTemplate[];
  waLogs: WaDeliveryLog[];
  waAutoReply: WaAutoReplySettings;
}

const PBKDF2_ITERATIONS = 120000;

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API tidak tersedia di lingkungan ini.');
  }
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const saltBuf = new Uint8Array(salt).buffer;
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptStudioBackup(
  payload: StudioBackupPayload,
  passphrase: string
): Promise<EncryptedBackupEnvelope> {
  const cleanPass = String(passphrase || '').trim();
  if (cleanPass.length < 4) {
    throw new Error('Kata sandi enkripsi backup minimal 4 karakter.');
  }
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error('Enkripsi AES-GCM tidak didukung di browser ini.');
  }

  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(cleanPass, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const ciphertextBuf = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv).buffer },
    key,
    plaintext
  );

  return {
    app: 'farid-studio-multimedia',
    version: 1,
    encrypted: true,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    ciphertextB64: bytesToBase64(new Uint8Array(ciphertextBuf)),
    createdAt: new Date().toISOString(),
  };
}

export async function decryptStudioBackup(
  rawJson: string,
  passphrase: string
): Promise<StudioBackupPayload> {
  const cleanPass = String(passphrase || '').trim();
  if (cleanPass.length < 4) {
    throw new Error('Masukkan kata sandi enkripsi backup minimal 4 karakter.');
  }

  let envelope: EncryptedBackupEnvelope;
  try {
    envelope = JSON.parse(rawJson) as EncryptedBackupEnvelope;
  } catch {
    throw new Error('File JSON backup tidak valid atau rusak.');
  }

  if (
    !envelope ||
    envelope.app !== 'farid-studio-multimedia' ||
    envelope.encrypted !== true ||
    envelope.algorithm !== 'AES-GCM' ||
    !envelope.saltB64 ||
    !envelope.ivB64 ||
    !envelope.ciphertextB64
  ) {
    throw new Error('Format file bukan backup terenkripsi Farid Studio yang valid.');
  }

  const salt = base64ToBytes(envelope.saltB64);
  const iv = base64ToBytes(envelope.ivB64);
  const ciphertext = base64ToBytes(envelope.ciphertextB64);
  const key = await deriveAesKey(cleanPass, salt);

  let decryptedBuf: ArrayBuffer;
  try {
    decryptedBuf = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv).buffer },
      key,
      new Uint8Array(ciphertext).buffer
    );
  } catch {
    throw new Error('Kata sandi backup salah atau data terenkripsi telah berubah.');
  }

  const parsed = JSON.parse(new TextDecoder().decode(decryptedBuf)) as StudioBackupPayload;
  if (!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.attendanceLogs)) {
    throw new Error('Struktur data di dalam backup tidak lengkap.');
  }
  return parsed;
}
