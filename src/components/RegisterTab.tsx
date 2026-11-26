import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  FileDown,
  Printer,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import type {
  CardDesignConfig,
  DuplicateReason,
  MemberRecord,
  PackageConfig,
} from '../types/studio';
import {
  isCardAlreadyClaimed,
  normalizeCardNumber,
  normalizePhoneNumber,
} from '../utils/cardLogic';
import { renderCr80DataUrl } from '../utils/cardRenderer';
import { generateMemberCr80Pdf } from '../utils/cr80Pdf';
import { computeCr80PdfLayout, type Cr80PdfFormat } from '../utils/cr80PdfLayout';

interface RegisterTabProps {
  members: MemberRecord[];
  packages: PackageConfig[];
  design: CardDesignConfig;
  prefilledCard: string;
  prefilledCategory: string;
  qrAutofilled: boolean;
  massQrMode: boolean;
  deviceRegisteredCard: string | null;
  onSubmitRegistration: (payload: {
    rawCardNumber: string;
    name: string;
    phone: string;
    category: string;
    org: string;
    address: string;
  }) => {
    saved: MemberRecord | null;
    error?: string;
    duplicateReason?: DuplicateReason;
    matchedMember?: MemberRecord;
  };
  onOpenQrScanner: () => void;
  onGoToPortal: (cardNumber?: string) => void;
  onResetDeviceLock: () => void;
}

export function RegisterTab({
  members,
  packages,
  design,
  prefilledCard,
  prefilledCategory,
  qrAutofilled,
  massQrMode,
  deviceRegisteredCard,
  onSubmitRegistration,
  onOpenQrScanner,
  onGoToPortal,
  onResetDeviceLock,
}: RegisterTabProps) {
  const [cardNumberInput, setCardNumberInput] = useState(prefilledCard);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(prefilledCategory || packages[0]?.id || 'Umum');
  const [org, setOrg] = useState('');
  const [address, setAddress] = useState('');
  const [previewImg, setPreviewImg] = useState('');
  const [backPreviewImg, setBackPreviewImg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [justRegisteredCard, setJustRegisteredCard] = useState<string | null>(null);
  const [justRegisteredMember, setJustRegisteredMember] = useState<MemberRecord | null>(null);
  const [pdfBusyFormat, setPdfBusyFormat] = useState<Cr80PdfFormat | null>(null);
  const [pdfNotice, setPdfNotice] = useState('');

  useEffect(() => {
    if (prefilledCard) setCardNumberInput(prefilledCard);
  }, [prefilledCard]);

  useEffect(() => {
    if (prefilledCategory) setCategory(prefilledCategory);
  }, [prefilledCategory]);

  const selectedPkg = packages.find((p) => p.id === category);
  const effectivePrefix = selectedPkg?.prefix || design.serialPrefix || 'FS';
  const normalizedCard = normalizeCardNumber(cardNumberInput, effectivePrefix);
  const existingActive = normalizedCard
    ? members.find(
        (m) =>
          normalizeCardNumber(m.cardNumber, effectivePrefix).toUpperCase() ===
            normalizedCard.toUpperCase() && isCardAlreadyClaimed(m)
      )
    : undefined;

  const normalizedPhone = normalizePhoneNumber(phone);
  const existingPhoneOwner =
    normalizedPhone.length >= 8
      ? members.find((m) => {
          if (!isCardAlreadyClaimed(m)) return false;
          const mp = normalizePhoneNumber(m.phone);
          return mp.length >= 8 && mp === normalizedPhone;
        })
      : undefined;

  const duplicateConflict = existingActive || existingPhoneOwner;
  const isJustRegisteredMatch =
    Boolean(justRegisteredCard) &&
    existingActive?.cardNumber.toUpperCase() === justRegisteredCard?.toUpperCase();
  const showRejectionConflict = Boolean(duplicateConflict) && !isJustRegisteredMatch;
  const isDeviceLockedOut = Boolean(deviceRegisteredCard) && !isJustRegisteredMatch;
  const deviceMember = deviceRegisteredCard
    ? members.find((m) => m.cardNumber.toUpperCase() === deviceRegisteredCard.toUpperCase())
    : undefined;

  const printableMember =
    justRegisteredMember || (isJustRegisteredMatch && existingActive ? existingActive : null);

  useEffect(() => {
    let active = true;
    const displayNo =
      existingActive?.cardNumber ||
      normalizedCard ||
      `${selectedPkg?.prefix || design.serialPrefix || 'FS'}-0001`;
    const displayCat = existingActive?.category || category;
    Promise.all([
      renderCr80DataUrl('front', design, packages, {
        cardNumber: displayNo,
        category: displayCat,
      }),
      renderCr80DataUrl('back', design, packages, {
        cardNumber: displayNo,
        category: displayCat,
      }),
    ])
      .then(([frontUrl, backUrl]) => {
        if (active) {
          setPreviewImg(frontUrl);
          setBackPreviewImg(backUrl);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [existingActive, normalizedCard, category, design, packages, selectedPkg]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setPdfNotice('');
    if (!cardNumberInput.trim() || !name.trim() || !phone.trim()) {
      setErrorMsg('Nomor Seri Kartu, Nama Lengkap, dan Nomor WhatsApp wajib diisi.');
      return;
    }
    const res = onSubmitRegistration({
      rawCardNumber: cardNumberInput,
      name,
      phone,
      category,
      org,
      address,
    });
    if (res.saved) {
      setJustRegisteredCard(res.saved.cardNumber);
      setJustRegisteredMember(res.saved);
      setCardNumberInput(res.saved.cardNumber);
    } else if (res.error) {
      setJustRegisteredCard(null);
      setJustRegisteredMember(null);
      setErrorMsg(res.error);
    }
  }

  async function handleExportCr80Pdf(format: Cr80PdfFormat) {
    if (!printableMember) return;
    setPdfBusyFormat(format);
    setPdfNotice('');
    try {
      const result = await generateMemberCr80Pdf({
        member: printableMember,
        design,
        packages,
        format,
        frontDataUrl: previewImg || undefined,
        backDataUrl: backPreviewImg || undefined,
      });
      setPdfNotice(
        `File ${result.filename} (${
          format === 'a4-sheet'
            ? 'Sheet A4 + Garis Potong CR80 85.6 × 53.98 mm'
            : '2 Halaman Kartu CR80 PVC'
        }) siap dicetak!`
      );
    } catch {
      setPdfNotice('Gagal membuat file PDF CR80. Coba gunakan opsi Cetak Langsung.');
    } finally {
      setPdfBusyFormat(null);
    }
  }

  function handleBrowserPrintCr80() {
    window.print();
  }

  const cr80LayoutPreview = printableMember
    ? computeCr80PdfLayout(printableMember, 'a4-sheet')
    : null;

  return (
    <section aria-label="2. Form Pendaftaran Member" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase">
              {massQrMode
                ? 'QR Massal: Khusus Daftar & Jadi Member Baru'
                : 'Aktivasi Instan Otomatis'}
            </p>
            <h2 className="font-display mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
              Formulir Pendaftaran &amp; Aktivasi Member
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenQrScanner}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-cyan-700 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Scan QR Kartu</span>
          </button>
        </div>

        <p className="mt-2 mb-5 text-xs leading-relaxed text-slate-500 sm:text-sm">
          Formulir ini khusus untuk pendaftaran menjadi member baru. Sistem menerapkan <strong className="font-semibold text-slate-800">pencegahan daftar ulang otomatis</strong> (1 nomor seri kartu &amp; 1 nomor WhatsApp hanya berlaku 1x aktivasi).
        </p>

        {deviceRegisteredCard && (
          <div
            data-testid="device-lock-alert"
            className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-xs text-indigo-950"
          >
            <div className="flex items-start gap-2.5">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
              <div className="flex-1 space-y-2">
                <p className="font-bold">
                  Perangkat Ini Sudah Terdaftar sebagai Member ({deviceRegisteredCard}
                  {deviceMember ? ` — ${deviceMember.name}` : ''})
                </p>
                <p className="leading-relaxed text-indigo-900">
                  Untuk mencegah pendaftaran ulang melalui QR Massal, silakan langsung menuju menu <strong>Cek Kartu</strong> untuk mengunduh atau menunjukkan kartu Anda.
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onGoToPortal(deviceRegisteredCard)}
                    className="rounded-lg bg-indigo-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-800"
                  >
                    Lihat Kartu Saya ({deviceRegisteredCard})
                  </button>
                  <button
                    type="button"
                    onClick={onResetDeviceLock}
                    className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                  >
                    Daftarkan Pelanggan Lain (Mode Meja Kasir)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`rounded-xl border p-4 ${
              showRejectionConflict && existingActive
                ? 'border-rose-300 bg-rose-50/70'
                : isJustRegisteredMatch
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-cyan-200 bg-cyan-50/60'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="reg-card-number"
                className={`block text-xs font-bold tracking-wide uppercase ${
                  showRejectionConflict && existingActive
                    ? 'text-rose-900'
                    : isJustRegisteredMatch
                      ? 'text-emerald-900'
                      : 'text-cyan-950'
                }`}
              >
                Nomor Seri Kartu Member Baru (Wajib) <span className="text-rose-600">*</span>
              </label>
              {qrAutofilled && (
                <span className="text-[11px] font-bold text-emerald-700">
                  Terisi Otomatis dari QR
                </span>
              )}
            </div>
            <input
              id="reg-card-number"
              type="text"
              required
              value={cardNumberInput}
              onChange={(e) => {
                setCardNumberInput(e.target.value);
                setJustRegisteredCard(null);
                setErrorMsg('');
              }}
              placeholder="Contoh: FS-0005, VIP-0001, EXC-0001 atau ketik 0005"
              className={`font-mono w-full rounded-lg border-2 bg-white px-4 py-2.5 text-base font-bold tracking-wider text-slate-900 uppercase focus:outline-none ${
                showRejectionConflict && existingActive
                  ? 'border-rose-500'
                  : isJustRegisteredMatch
                    ? 'border-emerald-600'
                    : 'border-cyan-600'
              }`}
            />
            <p
              className={`mt-1.5 text-[11px] ${
                showRejectionConflict && existingActive
                  ? 'font-semibold text-rose-700'
                  : isJustRegisteredMatch
                    ? 'font-semibold text-emerald-800'
                    : 'text-cyan-900'
              }`}
            >
              {isJustRegisteredMatch && existingActive
                ? `Berhasil: Kartu ${existingActive.cardNumber} baru saja AKTIF atas nama ${existingActive.name} dan kini terkunci dari daftar ulang.`
                : existingActive
                  ? `Ditolak: Nomor kartu ${existingActive.cardNumber} sudah AKTIF atas nama ${existingActive.name} dan tidak dapat didaftarkan ulang.`
                  : normalizedCard
                    ? `Nomor kartu ${normalizedCard} tersedia untuk pendaftaran member baru.`
                    : 'Masukkan kode awalan & nomor kartu baru Anda (contoh: FS-0005, VIP-0001, EXC-0001).'}
            </p>
          </div>

          {showRejectionConflict && duplicateConflict && (
            <div
              data-testid="duplicate-prevention-alert"
              role="alert"
              className="flex flex-col justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <div>
                  <p className="font-extrabold">Pencegahan Daftar Ulang Aktif</p>
                  <p className="mt-0.5 leading-relaxed">
                    {existingActive
                      ? `Kartu ${existingActive.cardNumber} sudah aktif dimiliki ${existingActive.name} (aktif sejak ${existingActive.registeredAt}).`
                      : `Nomor WhatsApp ${phone} sudah terdaftar sebagai member aktif (${existingPhoneOwner?.cardNumber} — ${existingPhoneOwner?.name}).`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onGoToPortal(duplicateConflict.cardNumber)}
                className="shrink-0 whitespace-nowrap rounded-lg bg-rose-700 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-rose-800"
              >
                Buka Cek Kartu ({duplicateConflict.cardNumber})
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-name" className="mb-1 block text-xs font-bold text-slate-700">
                Nama Lengkap <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Andi Muhammad Farid"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-cyan-700 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-phone" className="mb-1 block text-xs font-bold text-slate-700">
                Nomor WhatsApp Aktif (Unik 1x Daftar) <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setJustRegisteredCard(null);
                  setErrorMsg('');
                }}
                placeholder="0852xxxxxxxx"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none ${
                  showRejectionConflict && existingPhoneOwner
                    ? 'border-rose-500 bg-rose-50/50 focus:border-rose-600'
                    : 'border-slate-300 focus:border-cyan-700'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
            <span>
              Satu nomor kartu &amp; satu nomor WhatsApp hanya berlaku untuk 1 keanggotaan resmi. Verifikasi KTP &amp; KK dikelola rahasia oleh Admin.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-category" className="mb-1 block text-xs font-bold text-slate-700">
                Pilihan Paket Member <span className="text-rose-600">*</span>
              </label>
              <select
                id="reg-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-cyan-700 focus:outline-none"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.prefix || 'FS'}-XXXX)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-org" className="mb-1 block text-xs font-bold text-slate-700">
                Instansi / Kampus / Komunitas
              </label>
              <input
                id="reg-org"
                type="text"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="Contoh: UNHAS / Umum Makassar"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-cyan-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-address" className="mb-1 block text-xs font-bold text-slate-700">
              Alamat Domisili
            </label>
            <input
              id="reg-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Perintis Kemerdekaan, Makassar"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-cyan-700 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={showRejectionConflict || isDeviceLockedOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            <span>
              {showRejectionConflict
                ? 'Daftar 2x Diblokir (Nomor Kartu / WA Sudah Terdaftar)'
                : isDeviceLockedOut
                  ? `Perangkat Terkunci (${deviceRegisteredCard} Sudah Aktif)`
                  : 'Daftar & Aktifkan Menjadi Member'}
            </span>
          </button>
        </form>
      </div>

      <div className="space-y-5 lg:col-span-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">Pratinjau Kartu Member Digital</h3>
            <span
              className={`text-xs font-bold ${
                existingActive ? 'text-emerald-700' : 'text-cyan-800'
              }`}
            >
              {existingActive ? 'KARTU AKTIF' : 'SIAP AKTIVASI'}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 cr80-card-shadow">
            {previewImg ? (
              <img
                src={previewImg}
                alt="Pratinjau Kartu Member Digital CR80"
                className="block h-auto w-full"
              />
            ) : (
              <div className="flex aspect-[1011/638] items-center justify-center text-xs text-slate-400">
                Memuat pratinjau kartu...
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Catatan privasi: Fisik kartu cetak tidak menampilkan biodata terbuka. Data lengkap hanya dapat diakses oleh pemilik nomor seri dan Admin.
          </p>
        </div>

        {printableMember && (
          <div
            data-testid="instant-cr80-pdf-panel"
            className="space-y-4 rounded-2xl border-2 border-cyan-600 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-emerald-700 uppercase">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Registrasi Berhasil · Siap Cetak PDF</span>
                </p>
                <h3 className="font-display mt-0.5 text-base font-extrabold text-slate-900">
                  Cetak Instan PDF Kartu CR80
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Otomatis memformat data member <strong className="text-slate-800">{printableMember.name}</strong> ke ukuran standar CR80 (<span className="font-mono font-semibold">85.6 × 53.98 mm · 300 DPI</span>).
                </p>
              </div>
              <span className="font-mono shrink-0 rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-extrabold text-cyan-800">
                {printableMember.cardNumber}
              </span>
            </div>

            {backPreviewImg && previewImg && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                    Depan (85.6 × 53.98 mm)
                  </span>
                  <img
                    src={previewImg}
                    alt={`Sisi Depan CR80 ${printableMember.cardNumber}`}
                    className="w-full rounded-lg border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                    Belakang (85.6 × 53.98 mm)
                  </span>
                  <img
                    src={backPreviewImg}
                    alt={`Sisi Belakang CR80 ${printableMember.cardNumber}`}
                    className="w-full rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                data-testid="download-cr80-a4-pdf-btn"
                disabled={pdfBusyFormat !== null}
                onClick={() => handleExportCr80Pdf('a4-sheet')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:bg-slate-400"
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                <span>
                  {pdfBusyFormat === 'a4-sheet'
                    ? 'Memformat PDF Siap Cetak...'
                    : 'Unduh PDF Sheet A4 Siap Cetak (Depan + Belakang + Garis Potong)'}
                </span>
              </button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  data-testid="download-cr80-card-pdf-btn"
                  disabled={pdfBusyFormat !== null}
                  onClick={() => handleExportCr80Pdf('cr80-card')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
                >
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {pdfBusyFormat === 'cr80-card'
                      ? 'Menyiapkan...'
                      : 'PDF Ukuran Kartu CR80'}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="print-cr80-browser-btn"
                  onClick={handleBrowserPrintCr80}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
                  <span>Cetak Langsung / Save PDF</span>
                </button>
              </div>
            </div>

            {pdfNotice && (
              <p
                data-testid="pdf-export-status"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800"
              >
                {pdfNotice}
              </p>
            )}
          </div>
        )}

        {existingActive && (
          <div
            data-testid="ereceipt-box"
            className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"
          >
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <span className="text-xs font-extrabold tracking-wide text-emerald-900 uppercase">
                Data Asli Kartu Member Aktif
              </span>
              <span className="font-mono text-xs font-bold text-emerald-800">
                {existingActive.cardNumber}
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">Nama Pemilik</dt>
                <dd className="font-bold text-slate-900">{existingActive.name}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">Paket Member</dt>
                <dd className="font-bold text-cyan-800">{existingActive.category}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">No. WhatsApp</dt>
                <dd className="font-mono font-semibold text-slate-800">{existingActive.phone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">Instansi/Kampus</dt>
                <dd className="font-semibold text-slate-800">{existingActive.org || '-'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">Tanggal Aktif</dt>
                <dd className="font-semibold text-slate-800">{existingActive.registeredAt || '-'}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Print area formatted automatically to CR80 85.6mm x 53.98mm for window.print() */}
      {printableMember && cr80LayoutPreview && (
        <div id="print-area" className="hidden">
          <div style={{ maxWidth: '185mm', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <div
              style={{
                borderBottom: '1px solid #cbd5e1',
                paddingBottom: '4mm',
                marginBottom: '6mm',
              }}
            >
              <h2 style={{ fontSize: '14pt', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                FARID STUDIO MULTIMEDIA — KARTU MEMBER CR80 SIAP CETAK
              </h2>
              <p style={{ fontSize: '9pt', margin: '2mm 0 0', color: '#475569' }}>
                No. Kartu: <strong>{printableMember.cardNumber}</strong> · Nama:{' '}
                <strong>{printableMember.name}</strong> · Paket:{' '}
                <strong>{printableMember.category}</strong> · WA:{' '}
                <strong>{printableMember.phone}</strong> · Status:{' '}
                <strong>{printableMember.status}</strong> ({printableMember.registeredAt})
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 85.6mm)',
                gap: '8mm',
                justifyContent: 'center',
              }}
            >
              {previewImg && (
                <div>
                  <p style={{ fontSize: '8pt', fontWeight: 700, marginBottom: '2mm' }}>
                    SISI DEPAN (85.6 × 53.98 mm)
                  </p>
                  <img
                    src={previewImg}
                    alt={`Cetak CR80 Depan ${printableMember.cardNumber}`}
                    style={{
                      width: '85.6mm',
                      height: '53.98mm',
                      border: '0.3mm dashed #64748b',
                      borderRadius: '3.18mm',
                    }}
                  />
                </div>
              )}
              {backPreviewImg && (
                <div>
                  <p style={{ fontSize: '8pt', fontWeight: 700, marginBottom: '2mm' }}>
                    SISI BELAKANG (85.6 × 53.98 mm)
                  </p>
                  <img
                    src={backPreviewImg}
                    alt={`Cetak CR80 Belakang ${printableMember.cardNumber}`}
                    style={{
                      width: '85.6mm',
                      height: '53.98mm',
                      border: '0.3mm dashed #64748b',
                      borderRadius: '3.18mm',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
