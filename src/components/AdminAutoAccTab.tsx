import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Cloud,
  ExternalLink,
  IdCard,
  KeyRound,
  LogIn,
  LogOut,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import type { DuplicateAttemptLog, MemberRecord } from '../types/studio';
import { analyzeRegistrationDuplicates, formatWhatsAppUrl } from '../utils/cardLogic';

interface AdminAutoAccTabProps {
  members: MemberRecord[];
  duplicateLogs: DuplicateAttemptLog[];
  autoLockOnBlur: boolean;
  adminPhone: string;
  cloudUserEmail: string | null;
  cloudSyncBusy: boolean;
  onSaveAdminPhone: (nextPhone: string) => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onSyncCloudSql: () => void;
  onAutoAccInput: (value: string) => string | null;
  onToggleBlurAutoLock: (enabled: boolean) => void;
  onOpenKtpModal: (cardNumber: string) => void;
  onToggleMemberStatus: (cardNumber: string) => void;
  onOpenAuditModal: () => void;
  onOpenChangePinModal: () => void;
  onClearDuplicateLogs: () => void;
}

export function AdminAutoAccTab({
  members,
  duplicateLogs,
  autoLockOnBlur,
  adminPhone,
  cloudUserEmail,
  cloudSyncBusy,
  onSaveAdminPhone,
  onGoogleSignIn,
  onGoogleSignOut,
  onSyncCloudSql,
  onAutoAccInput,
  onToggleBlurAutoLock,
  onOpenKtpModal,
  onToggleMemberStatus,
  onOpenAuditModal,
  onOpenChangePinModal,
  onClearDuplicateLogs,
}: AdminAutoAccTabProps) {
  const [accInput, setAccInput] = useState('');
  const [lastActivated, setLastActivated] = useState('');
  const [search, setSearch] = useState('');
  const [phoneDraft, setPhoneDraft] = useState(adminPhone || '+62-8523-097-571');

  useEffect(() => {
    setPhoneDraft(adminPhone || '+62-8523-097-571');
  }, [adminPhone]);

  const waUrl = formatWhatsAppUrl(phoneDraft);

  const analysis = useMemo(
    () => analyzeRegistrationDuplicates(members, duplicateLogs),
    [members, duplicateLogs]
  );

  const q = search.trim().toLowerCase();
  const filtered = members.filter(
    (m) =>
      !q ||
      m.cardNumber.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      (m.nik && m.nik.includes(q)) ||
      (m.kkNumber && m.kkNumber.includes(q))
  );

  function handleAccChange(val: string) {
    setAccInput(val);
    const activated = onAutoAccInput(val);
    if (activated) {
      setLastActivated(activated);
      setAccInput('');
    }
  }

  return (
    <section aria-label="4. Admin Auto-ACC" className="space-y-6">
      <div className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-emerald-300 uppercase">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Auto-ACC Real-Time Berdasarkan Nomor Kartu
            </p>
            <h2 className="font-display text-xl font-extrabold sm:text-2xl">
              Terminal Aktivasi &amp; ACC Otomatis
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Ketik 4 digit nomor seri kartu (contoh: <code className="font-mono text-cyan-300">0003</code>) atau scan QR kartu — status langsung otomatis berubah menjadi <strong className="text-white">AKTIF (ACC)</strong> tanpa perlu klik konfirmasi tambahan.
            </p>
          </div>
          <div className="w-full space-y-2 lg:w-96">
            <label htmlFor="auto-acc-input" className="sr-only">
              Input Nomor Kartu Auto-ACC
            </label>
            <input
              id="auto-acc-input"
              type="text"
              value={accInput}
              onChange={(e) => handleAccChange(e.target.value)}
              placeholder="Ketik 0001 atau FS-0001..."
              className="font-mono w-full rounded-lg border-2 border-cyan-500 bg-slate-800 px-4 py-3 text-base font-bold tracking-widest text-white uppercase placeholder:text-slate-400 focus:outline-none"
            />
            {lastActivated && (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-950/60 p-3 text-xs font-bold text-emerald-200">
                Kartu {lastActivated} otomatis menjadi AKTIF (ACC).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sinkronisasi Akun Google & Backup Cloud */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
            <Cloud className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900">
              Sinkronisasi Database Studio (Google Admin)
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {cloudUserEmail
                ? `Masuk sebagai ${cloudUserEmail}. Data member, kehadiran, dan log duplikat siap disinkronkan ke server.`
                : 'Masuk dengan akun Google Admin untuk menyimpan dan memuat ulang seluruh database member lintas perangkat.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!cloudUserEmail ? (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-cyan-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Masuk dengan Google</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={cloudSyncBusy}
                onClick={onSyncCloudSql}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:bg-slate-400"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${cloudSyncBusy ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{cloudSyncBusy ? 'Menyinkronkan...' : 'Simpan & Sinkron Sekarang'}</span>
              </button>
              <button
                type="button"
                onClick={onGoogleSignOut}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar Google</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pengaturan Nomor WhatsApp Admin & Kartu CR80 */}
      <div
        data-testid="admin-whatsapp-panel"
        className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900">
              Nomor WhatsApp Admin &amp; Kartu CR80 (Bisa Diganti)
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Nomor ini tampil sebagai kontak Admin dan tercetak di sisi depan &amp; belakang kartu member CR80. Perubahan langsung memperbarui desain kartu &amp; PDF cetak.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <label htmlFor="admin-wa-input" className="sr-only">
            Nomor WhatsApp Admin
          </label>
          <input
            id="admin-wa-input"
            type="text"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="+62-8523-097-571"
            className="font-mono w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-cyan-700 focus:outline-none sm:w-48"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="save-admin-wa-btn"
              onClick={() => onSaveAdminPhone(phoneDraft.trim() || '+62-8523-097-571')}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-cyan-700 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Simpan ke Admin &amp; Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoneDraft('+62-8523-097-571');
                onSaveAdminPhone('+62-8523-097-571');
              }}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Default</span>
            </button>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <span>Chat WA</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Analisis & Pencegahan Daftar 2 Kali */}
      <div
        data-testid="duplicate-analysis-panel"
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold text-cyan-800 uppercase">
              Audit Integritas Nomor Kartu &amp; Anti Daftar 2 Kali
            </p>
            <h3 className="font-display mt-0.5 text-lg font-extrabold text-slate-900">
              Analisis &amp; Pencegahan Daftar 2 Kali Menjadi Member
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Mendeteksi celah pendaftaran ganda lewat variasi format nomor kartu, nomor WhatsApp, maupun perangkat yang sama.
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
              analysis.riskStatus === 'AMAN'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {analysis.riskStatus === 'AMAN' ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {analysis.riskStatus === 'AMAN'
                ? 'Status Database: AMAN (Bebas Duplikat)'
                : `Perlu Tinjau (${analysis.duplicateCardGroups.length} Kartu / ${analysis.duplicatePhoneGroups.length} WA Ganda)`}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Member Aktif Terproteksi</p>
            <p className="tabular-nums mt-1 text-xl font-extrabold text-slate-900">
              {analysis.activeMembersCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Daftar 2x Diblokir</p>
            <p
              data-testid="stat-dup-blocked"
              className="tabular-nums mt-1 text-xl font-extrabold text-rose-700"
            >
              {analysis.blockedAttemptsTotal}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Kartu: {analysis.blockedByCardCount} · WA: {analysis.blockedByPhoneCount} · HP:{' '}
              {analysis.blockedByDeviceCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Duplikasi Kartu / WA di DB</p>
            <p className="tabular-nums mt-1 text-xl font-extrabold text-indigo-700">
              {analysis.duplicateCardGroups.length + analysis.duplicatePhoneGroups.length}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Kartu: {analysis.duplicateCardGroups.length} · WA: {analysis.duplicatePhoneGroups.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Slot Kartu Siap Klaim</p>
            <p className="tabular-nums mt-1 text-xl font-extrabold text-cyan-800">
              {analysis.availableSlotsCount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
            <p className="font-bold text-slate-900">1. Normalisasi Kanonik Kartu</p>
            <p className="mt-1 leading-relaxed text-slate-600">
              Variasi spasi/simbol (<code className="font-mono">FS 0001</code>, <code className="font-mono">FS/1</code>, <code className="font-mono">fs0001</code>) disamakan menjadi <code className="font-mono">FS-0001</code> agar tidak lolos daftar 2x.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
            <p className="font-bold text-slate-900">2. Kunci Kartu Terklaim</p>
            <p className="mt-1 leading-relaxed text-slate-600">
              Nomor kartu yang sudah aktif atau pernah dimiliki member tidak bisa didaftarkan ulang. Hanya slot kosong <strong>BELUM_AKTIF</strong> yang boleh diklaim.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
            <p className="font-bold text-slate-900">3. Validasi Unik WhatsApp</p>
            <p className="mt-1 leading-relaxed text-slate-600">
              Format <code className="font-mono">+62</code>, <code className="font-mono">62</code>, dan <code className="font-mono">08</code> dinormalisasi sehingga 1 nomor WhatsApp tidak bisa mendaftar kartu kedua.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
            <p className="font-bold text-slate-900">4. Kunci Perangkat QR Massal</p>
            <p className="mt-1 leading-relaxed text-slate-600">
              Perangkat yang sudah mendaftar menjadi member langsung terkunci dari pendaftaran kedua (kecuali dibuka via <strong>Mode Meja Kasir</strong>).
            </p>
          </div>
        </div>

        {(analysis.duplicateCardGroups.length > 0 || analysis.duplicatePhoneGroups.length > 0) && (
          <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
            <p className="font-bold">
              Ditemukan Data Ganda dari Import/Edit Manual:
            </p>
            {analysis.duplicateCardGroups.length > 0 && (
              <ul className="space-y-1">
                {analysis.duplicateCardGroups.map((grp) => (
                  <li key={grp.normalizedCard} className="font-mono text-[11px]">
                    Kartu Ganda {grp.normalizedCard}:{' '}
                    {grp.members.map((m) => `${m.name} (${m.phone})`).join(', ')}
                  </li>
                ))}
              </ul>
            )}
            {analysis.duplicatePhoneGroups.length > 0 && (
              <ul className="space-y-1">
                {analysis.duplicatePhoneGroups.map((grp) => (
                  <li key={grp.normalizedPhone} className="font-mono text-[11px]">
                    WA Ganda {grp.normalizedPhone}:{' '}
                    {grp.members.map((m) => `${m.cardNumber} (${m.name})`).join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-800">
              Riwayat Percobaan Daftar 2x yang Diblokir
            </p>
            {duplicateLogs.length > 0 && (
              <button
                type="button"
                onClick={onClearDuplicateLogs}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                <span>Bersihkan Log Blokir</span>
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                <tr>
                  <th className="p-2.5">Waktu</th>
                  <th className="p-2.5">Alasan Blokir</th>
                  <th className="p-2.5">Input Kartu</th>
                  <th className="p-2.5">Input Nama / WA</th>
                  <th className="p-2.5">Member Aktif Terkait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {duplicateLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      Belum ada percobaan daftar 2x yang terdeteksi.
                    </td>
                  </tr>
                ) : (
                  duplicateLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="font-mono p-2.5 text-[11px] text-slate-500">{log.ts}</td>
                      <td className="p-2.5 font-bold text-rose-700">
                        {log.reason === 'CARD_ALREADY_ACTIVE'
                          ? 'Kartu Sudah Terdaftar'
                          : log.reason === 'DEVICE_ALREADY_REGISTERED'
                            ? 'Perangkat Sudah Terdaftar'
                            : 'WhatsApp Sudah Terdaftar'}
                      </td>
                      <td className="font-mono p-2.5 font-bold text-slate-800">{log.cardNumber}</td>
                      <td className="p-2.5 text-slate-700">
                        {log.attemptedName} ({log.attemptedPhone})
                      </td>
                      <td className="p-2.5 font-semibold text-cyan-800">
                        {log.matchedCardNumber} — {log.matchedName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-base font-extrabold text-slate-900">
              Daftar Member &amp; Pengelolaan KTP / KK (Khusus Admin)
            </h3>
            <p className="text-xs text-slate-500">
              Klik <strong>Kelola KTP</strong> pada masing-masing baris untuk menginput atau mengedit NIK &amp; Nomor Kartu Keluarga.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="admin-search-input" className="sr-only">
              Cari Member Admin
            </label>
            <input
              id="admin-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor kartu, nama, atau NIK..."
              className="w-56 rounded-lg border border-slate-300 px-3.5 py-2 text-xs focus:border-cyan-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={onOpenAuditModal}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Log Keamanan</span>
            </button>
            <button
              type="button"
              onClick={onOpenChangePinModal}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ubah PIN &amp; Master Key</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>
              <strong>Proteksi Super Ketat Aktif:</strong> Enkripsi SHA-256 + 2FA Master Key + Auto-Lock Idle 5 Menit.
            </span>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-amber-300">
            <input
              type="checkbox"
              checked={autoLockOnBlur}
              onChange={(e) => onToggleBlurAutoLock(e.target.checked)}
              className="rounded border-slate-600 text-cyan-600"
            />
            <span>Kunci otomatis saat pindah tab browser</span>
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                <th className="p-3">No. Kartu</th>
                <th className="p-3">Nama Member</th>
                <th className="p-3">Arsip KTP &amp; KK (Rahasia)</th>
                <th className="p-3">No. WhatsApp</th>
                <th className="p-3">Paket</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    Tidak ada data member yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.cardNumber} className="hover:bg-slate-50">
                    <td className="font-mono p-3 font-bold text-cyan-800">{m.cardNumber}</td>
                    <td className="p-3 font-bold text-slate-900">{m.name}</td>
                    <td className="p-3">
                      {m.nik || m.kkNumber ? (
                        <div className="font-mono text-[11px] text-slate-700">
                          NIK: <strong>{m.nik || '-'}</strong>
                          <br />
                          KK: {m.kkNumber || '-'}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum diinput Admin</span>
                      )}
                    </td>
                    <td className="font-mono p-3 text-slate-700">{m.phone || '-'}</td>
                    <td className="p-3 font-semibold text-indigo-800">{m.category}</td>
                    <td className="p-3">
                      <span
                        className={`font-bold ${
                          m.status === 'AKTIF' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="space-x-1.5 p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenKtpModal(m.cardNumber)}
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
                      >
                        <IdCard className="h-3 w-3" aria-hidden="true" />
                        <span>Kelola KTP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleMemberStatus(m.cardNumber)}
                        className="rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-900"
                      >
                        {m.status === 'AKTIF' ? 'Nonaktifkan' : 'ACC Aktif'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
