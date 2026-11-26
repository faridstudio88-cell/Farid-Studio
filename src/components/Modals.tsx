import { useEffect, useRef, useState, type FormEvent } from 'react';
import jsQR from 'jsqr';
import { ClipboardList, IdCard, KeyRound, QrCode, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import type { MemberRecord, SecurityLog } from '../types/studio';

interface PinModalProps {
  open: boolean;
  lockoutSeconds: number;
  onClose: () => void;
  onVerify: (pin: string, masterKey: string) => void;
}

export function PinModal({ open, lockoutSeconds, onClose, onVerify }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [masterKey, setMasterKey] = useState('');

  useEffect(() => {
    if (open) {
      setPin('');
      setMasterKey('');
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onVerify(pin, masterKey);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 id="pin-modal-title" className="font-display text-base font-extrabold text-slate-900">
                Akses Khusus Administrator
              </h3>
              <p className="text-[11px] text-slate-500">
                Masukkan PIN &amp; Master Security Key yang hanya diketahui Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal login"
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {lockoutSeconds > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Terlalu banyak percobaan gagal. Coba lagi dalam{' '}
              <span className="font-mono font-bold">{lockoutSeconds}</span> detik.
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="admin-pin-input" className="mb-1 block text-[11px] font-bold text-slate-700">
              1. PIN Rahasia Admin
            </label>
            <input
              id="admin-pin-input"
              type="password"
              maxLength={12}
              autoFocus
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Masukkan PIN Admin..."
              className="font-mono w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm tracking-widest focus:border-cyan-700 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="admin-master-key-input"
              className="mb-1 block text-[11px] font-bold text-slate-700"
            >
              2. Master Security Key Studio
            </label>
            <input
              id="admin-master-key-input"
              type="password"
              maxLength={24}
              autoComplete="off"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              placeholder="Masukkan Master Security Key..."
              className="font-mono w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm tracking-wider uppercase focus:border-cyan-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={lockoutSeconds > 0}
            className="flex-1 rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Verifikasi &amp; Buka
          </button>
        </div>
      </form>
    </div>
  );
}

interface ChangePinModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (newPin: string, newMasterKey: string) => void;
}

export function ChangePinModal({ open, onClose, onSave }: ChangePinModalProps) {
  const [newPin, setNewPin] = useState('');
  const [newMk, setNewMk] = useState('');

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pin-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="change-pin-title" className="font-display flex items-center gap-2 text-base font-extrabold text-slate-900">
            <KeyRound className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span>Ubah PIN &amp; Master Key Admin</span>
          </h3>
          <button type="button" onClick={onClose} aria-label="Tutup modal ubah PIN" className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="new-pin-input" className="mb-1 block text-[11px] font-bold text-slate-700">
              PIN Admin Baru (Minimal 4 digit)
            </label>
            <input
              id="new-pin-input"
              type="password"
              maxLength={12}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Masukkan PIN baru..."
              className="font-mono w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="new-mk-input" className="mb-1 block text-[11px] font-bold text-slate-700">
              Master Security Key Baru (Minimal 4 karakter)
            </label>
            <input
              id="new-mk-input"
              type="password"
              maxLength={24}
              value={newMk}
              onChange={(e) => setNewMk(e.target.value)}
              placeholder="Masukkan Master Key baru..."
              className="font-mono w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm uppercase"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(newPin, newMk);
              setNewPin('');
              setNewMk('');
            }}
            className="flex-1 rounded-lg bg-cyan-700 py-2.5 text-xs font-bold text-white hover:bg-cyan-800"
          >
            Simpan Kredensial
          </button>
        </div>
      </div>
    </div>
  );
}

interface KtpModalProps {
  member: MemberRecord | null;
  onClose: () => void;
  onSave: (cardNumber: string, data: { nik: string; kkNumber: string; kkRelation: string; ktpAddress: string }) => void;
}

export function KtpModal({ member, onClose, onSave }: KtpModalProps) {
  const [nik, setNik] = useState('');
  const [kkNumber, setKkNumber] = useState('');
  const [kkRelation, setKkRelation] = useState('Kepala Keluarga');
  const [ktpAddress, setKtpAddress] = useState('');

  useEffect(() => {
    if (member) {
      setNik(member.nik || '');
      setKkNumber(member.kkNumber || '');
      setKkRelation(member.kkRelation || 'Kepala Keluarga');
      setKtpAddress(member.ktpAddress || member.address || '');
    }
  }, [member]);

  if (!member) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ktp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 id="ktp-modal-title" className="font-display flex items-center gap-2 text-base font-extrabold text-slate-900">
              <IdCard className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              <span>Arsip KTP &amp; Kartu Keluarga (KK)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Nomor Kartu: {member.cardNumber} — {member.name}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal KTP" className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ktp-nik" className="mb-1 block text-[11px] font-bold text-slate-700">
              NIK KTP (16 Digit)
            </label>
            <input
              id="ktp-nik"
              type="text"
              maxLength={16}
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="7371xxxxxxxxxxxx"
              className="font-mono w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs"
            />
          </div>
          <div>
            <label htmlFor="ktp-kk" className="mb-1 block text-[11px] font-bold text-slate-700">
              Nomor Kartu Keluarga (16 Digit)
            </label>
            <input
              id="ktp-kk"
              type="text"
              maxLength={16}
              value={kkNumber}
              onChange={(e) => setKkNumber(e.target.value)}
              placeholder="7371xxxxxxxxxxxx"
              className="font-mono w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs"
            />
          </div>
        </div>
        <div>
          <label htmlFor="ktp-rel" className="mb-1 block text-[11px] font-bold text-slate-700">
            Status Hubungan Dalam KK
          </label>
          <select
            id="ktp-rel"
            value={kkRelation}
            onChange={(e) => setKkRelation(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs"
          >
            <option value="Kepala Keluarga">Kepala Keluarga</option>
            <option value="Istri">Istri</option>
            <option value="Anak">Anak</option>
            <option value="Famili Lain">Famili Lain</option>
          </select>
        </div>
        <div>
          <label htmlFor="ktp-addr" className="mb-1 block text-[11px] font-bold text-slate-700">
            Alamat Lengkap Sesuai KTP
          </label>
          <textarea
            id="ktp-addr"
            rows={2}
            value={ktpAddress}
            onChange={(e) => setKtpAddress(e.target.value)}
            placeholder="Masukkan alamat lengkap sesuai KTP..."
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSave(member.cardNumber, { nik, kkNumber, kkRelation, ktpAddress })}
            className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Simpan Data KTP &amp; KK
          </button>
        </div>
      </div>
    </div>
  );
}

interface SecurityAuditModalProps {
  open: boolean;
  logs: SecurityLog[];
  onClose: () => void;
}

export function SecurityAuditModal({ open, logs, onClose }: SecurityAuditModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 id="audit-modal-title" className="font-display flex items-center gap-2 text-base font-extrabold text-slate-900">
            <ClipboardList className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span>Log Audit Keamanan Admin</span>
          </h3>
          <button type="button" onClick={onClose} aria-label="Tutup log keamanan" className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-xs">
          {logs.length === 0 ? (
            <div className="p-4 text-center text-slate-400">Belum ada log aktivitas keamanan.</div>
          ) : (
            logs.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 p-3">
                <div>
                  <span
                    className={`mr-2 font-bold ${
                      item.level === 'ALERT'
                        ? 'text-rose-700'
                        : item.level === 'WARN'
                          ? 'text-amber-700'
                          : 'text-slate-600'
                    }`}
                  >
                    [{item.level}]
                  </span>
                  <span className="font-medium text-slate-800">{item.action}</span>
                </div>
                <span className="font-mono text-[11px] whitespace-nowrap text-slate-400">
                  {item.ts}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

interface PublicQrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (rawData: string) => void;
  onCameraError: () => void;
}

export function PublicQrScannerModal({
  open,
  onClose,
  onDetected,
  onCameraError,
}: PublicQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        timer = window.setInterval(() => {
          if (!videoRef.current || videoRef.current.readyState < 2 || !videoRef.current.videoWidth || !ctx) {
            return;
          }
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code?.data) {
            onDetected(code.data);
          }
        }, 320);
      })
      .catch(() => {
        if (!cancelled) onCameraError();
      });

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetected, onCameraError]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scan-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-700 text-white">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 id="qr-scan-modal-title" className="font-display text-base font-extrabold text-slate-900">
                Scanner QR Daftar Otomatis
              </h3>
              <p className="text-[11px] text-slate-500">
                Arahkan kamera ke QR Poster Studio atau QR Fisik Kartu
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup scanner QR" className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-cyan-600 bg-slate-950">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        </div>

        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
          Begitu QR Code terdeteksi, nomor seri kartu dan paket langsung terisi otomatis di formulir pendaftaran.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
        >
          Tutup Kamera
        </button>
      </div>
    </div>
  );
}
