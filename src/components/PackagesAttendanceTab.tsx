import { useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  BarChart3,
  CalendarRange,
  Camera,
  Clock,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Square,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AttendanceLog, PackageConfig } from '../types/studio';
import {
  buildFilteredAttendanceDashboardSummary,
  resolveAttendanceDatePreset,
  type CategoryDistributionPoint,
  type DateRangePreset,
  type HourlyPeakPoint,
  type RangePeriodPoint,
} from '../utils/cardLogic';

interface PackagesAttendanceTabProps {
  packages: PackageConfig[];
  attendanceLogs: AttendanceLog[];
  onSavePackages: (next: PackageConfig[]) => void;
  onSelectPackageForReg: (pkgId: string) => void;
  onCheckIn: (
    rawInput: string,
    purpose: string
  ) => { status: 'ok' | 'not_found' | 'inactive' | 'empty'; cardNumber: string; log?: AttendanceLog; memberName?: string; memberStatus?: string };
  onDeleteLog: (id: string) => void;
  onClearLogs: () => void;
  onExportAttendance: () => void;
}

const PURPOSES = [
  'Sesi Foto Studio',
  'Foto Wisuda / Keluarga',
  'Cetak Foto / Bingkai',
  'Klaim Diskon / Benefit Member',
  'Konsultasi & Booking Event',
];

function PeriodTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RangePeriodPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-bold text-slate-900">{item.fullLabel}</p>
      <p className="tabular-nums mt-1 font-semibold text-cyan-800">
        {item.count} check-in member
      </p>
      <p className="tabular-nums mt-0.5 text-[11px] text-slate-500">
        {item.uniqueMembers} member unik · Jam ramai:{' '}
        <span className="font-semibold text-slate-700">{item.peakHourLabel}</span>
      </p>
    </div>
  );
}

function HourlyTooltip({
  active,
  payload,
  rangeLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: HourlyPeakPoint }>;
  rangeLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-mono font-bold text-slate-900">Pukul {item.hourLabel}</p>
      <p className="tabular-nums mt-1 font-semibold text-indigo-700">
        {item.count} kunjungan
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{rangeLabel}</p>
      {item.isPeak && (
        <p className="mt-0.5 text-[11px] font-bold text-emerald-700">Jam Puncak Pengunjung</p>
      )}
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryDistributionPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-bold text-slate-900">Paket {item.category}</p>
      <p className="tabular-nums mt-1 font-semibold text-cyan-800">
        {item.count} kunjungan ({item.percentage}%)
      </p>
    </div>
  );
}

function TrendLineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RangePeriodPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-bold text-slate-900">{item.fullLabel}</p>
      <p className="tabular-nums mt-1 font-semibold text-indigo-700">
        {item.count} total check-in
      </p>
      <p className="tabular-nums mt-0.5 text-[11px] text-slate-500">
        {item.uniqueMembers} kartu member aktif berkunjung
      </p>
    </div>
  );
}

const DATE_PRESETS: Array<{ id: Exclude<DateRangePreset, 'custom'>; label: string }> = [
  { id: '7d', label: '7 Hari (Mingguan)' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'last-month', label: 'Bulan Lalu' },
  { id: '30d', label: '30 Hari' },
  { id: '6m', label: '6 Bulan' },
];

export function PackagesAttendanceTab({
  packages,
  attendanceLogs,
  onSavePackages,
  onSelectPackageForReg,
  onCheckIn,
  onDeleteLog,
  onClearLogs,
  onExportAttendance,
}: PackagesAttendanceTabProps) {
  const defaultRange = useMemo(() => resolveAttendanceDatePreset('7d'), []);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftPackages, setDraftPackages] = useState<PackageConfig[]>(packages);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [scanInput, setScanInput] = useState('');
  const [attSearch, setAttSearch] = useState('');
  const [chartMode, setChartMode] = useState<'daily' | 'hourly'>('daily');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('7d');
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [syncTableWithDateRange, setSyncTableWithDateRange] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'error' | 'warn';
    title: string;
    detail: string;
  } | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftPackages(packages);
  }, [packages]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function toggleCamera() {
    if (cameraActive) {
      stopCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let lastDetected = '';
        let lastTime = 0;
        timerRef.current = window.setInterval(() => {
          if (!streamRef.current || !videoRef.current || videoRef.current.readyState < 2 || !videoRef.current.videoWidth || !ctx) {
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
            const now = Date.now();
            if (code.data !== lastDetected || now - lastTime > 3500) {
              lastDetected = code.data;
              lastTime = now;
              triggerCheckIn(code.data);
            }
          }
        }, 350);
      }, 60);
    } catch {
      setFeedback({
        type: 'error',
        title: 'Kamera Tidak Tersedia',
        detail: 'Tidak dapat mengakses kamera perangkat. Pastikan izin kamera diaktifkan.',
      });
    }
  }

  function triggerCheckIn(rawValue: string) {
    const res = onCheckIn(rawValue, purpose);
    if (res.status === 'empty') return;
    if (res.status === 'not_found') {
      setFeedback({
        type: 'error',
        title: 'Kartu Tidak Terdaftar',
        detail: `Nomor kartu ${res.cardNumber} tidak ditemukan di database.`,
      });
    } else if (res.status === 'inactive') {
      setFeedback({
        type: 'warn',
        title: 'Kartu Belum Aktif',
        detail: `Kartu ${res.cardNumber} berstatus ${res.memberStatus}. Aktifkan terlebih dahulu di Auto-ACC atau Form Daftar.`,
      });
    } else if (res.log) {
      setFeedback({
        type: 'ok',
        title: `CHECK-IN BERHASIL — ${res.log.cardNumber}`,
        detail: `${res.log.name} (${res.log.category}) · Keperluan: ${res.log.purpose} · ${res.log.timestamp}`,
      });
    }
    setScanInput('');
  }

  function handleScanChange(val: string) {
    setScanInput(val);
    const cleaned = val.trim();
    if (/^\d{4,}$/.test(cleaned) || /^[A-Z0-9]+-\d{4,}$/i.test(cleaned) || cleaned.includes('kartu=')) {
      triggerCheckIn(cleaned);
    }
  }

  function handleAddDraftPackage() {
    const num = draftPackages.length + 1;
    setDraftPackages([
      ...draftPackages,
      {
        id: `Paket_${num}`,
        prefix: `PKT${num}`,
        cardLabel: `Paket: Custom ${num}`,
        name: `Paket Baru ${num}`,
        price: 75000,
        duration: '1 Tahun',
        badge: 'Baru',
        color: 'cyan',
        benefits: 'Benefit khusus member baru Farid Studio.',
      },
    ]);
  }

  function applyDatePreset(preset: Exclude<DateRangePreset, 'custom'>) {
    const resolved = resolveAttendanceDatePreset(preset);
    setDatePreset(preset);
    setStartDate(resolved.startDate);
    setEndDate(resolved.endDate);
  }

  function handleStartDateChange(value: string) {
    setDatePreset('custom');
    setStartDate(value);
  }

  function handleEndDateChange(value: string) {
    setDatePreset('custom');
    setEndDate(value);
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = attendanceLogs.filter((l) => l.dateKey === todayKey).length;
  const uniqueCards = new Set(attendanceLogs.map((l) => l.cardNumber)).size;
  const dashboardSummary = useMemo(
    () => buildFilteredAttendanceDashboardSummary(attendanceLogs, startDate, endDate),
    [attendanceLogs, startDate, endDate]
  );
  const isReversedRange = Boolean(startDate && endDate && startDate > endDate);

  const q = attSearch.trim().toLowerCase();
  const baseTableLogs = syncTableWithDateRange ? dashboardSummary.filteredLogs : attendanceLogs;
  const filteredLogs = baseTableLogs.filter(
    (l) =>
      !q ||
      l.cardNumber.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.purpose.toLowerCase().includes(q)
  );

  return (
    <section aria-label="7. Paket Harga & Kehadiran Studio" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold text-cyan-800 uppercase">
              Manajemen Tarif, Kode Seri &amp; Label Kartu
            </p>
            <h2 className="font-display mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
              Paket Harga Member Farid Studio
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Atur harga paket, kode awalan nomor seri (mis. FS, VIP, EXC), serta teks label paket di kartu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen(!editorOpen)}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{editorOpen ? 'Tutup Editor Paket' : 'Edit / Tambah Paket'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {packages.map((pkg) => {
            const isExclusive = pkg.id === 'Exclusive';
            return (
              <div
                key={pkg.id}
                className={`flex flex-col justify-between rounded-xl border p-5 ${
                  isExclusive
                    ? 'border-amber-400 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`font-mono font-bold ${
                        isExclusive ? 'text-amber-300' : 'text-cyan-800'
                      }`}
                    >
                      {pkg.prefix || 'FS'}-XXXX
                    </span>
                    <span className={isExclusive ? 'text-slate-300' : 'text-slate-500'}>
                      {pkg.duration}
                    </span>
                  </div>
                  <h3
                    className={`font-display text-base font-extrabold ${
                      isExclusive ? 'text-amber-300' : 'text-slate-900'
                    }`}
                  >
                    {pkg.name}
                  </h3>
                  <p
                    className={`tabular-nums mt-2 text-2xl font-black ${
                      isExclusive ? 'text-white' : 'text-cyan-800'
                    }`}
                  >
                    Rp {Number(pkg.price || 0).toLocaleString('id-ID')}
                  </p>
                  <p
                    className={`mt-1 text-[11px] font-semibold ${
                      isExclusive ? 'text-amber-200' : 'text-indigo-700'
                    }`}
                  >
                    {pkg.cardLabel}
                  </p>
                  <p
                    className={`mt-3 text-xs leading-relaxed ${
                      isExclusive ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {pkg.benefits}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPackageForReg(pkg.id)}
                  className={`mt-5 w-full rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${
                    isExclusive
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : 'bg-cyan-700 text-white hover:bg-cyan-800'
                  }`}
                >
                  Pilih Paket Ini
                </button>
              </div>
            );
          })}
        </div>

        {editorOpen && (
          <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Editor Paket Keanggotaan</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddDraftPackage}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-800"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tambah Paket</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSavePackages(draftPackages);
                    setEditorOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Simpan Semua Paket</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {draftPackages.map((pkg, idx) => (
                <div
                  key={`${pkg.id}-${idx}`}
                  className="grid grid-cols-1 items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5 md:grid-cols-12"
                >
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Kode Awalan
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={pkg.prefix}
                      onChange={(e) => {
                        const next = [...draftPackages];
                        next[idx] = { ...pkg, prefix: e.target.value.toUpperCase() };
                        setDraftPackages(next);
                      }}
                      className="font-mono mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-bold uppercase"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Teks di Kartu
                    </label>
                    <input
                      type="text"
                      value={pkg.cardLabel}
                      onChange={(e) => {
                        const next = [...draftPackages];
                        next[idx] = { ...pkg, cardLabel: e.target.value };
                        setDraftPackages(next);
                      }}
                      className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Nama Paket
                    </label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => {
                        const next = [...draftPackages];
                        next[idx] = { ...pkg, name: e.target.value };
                        setDraftPackages(next);
                      }}
                      className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Harga (Rp)
                    </label>
                    <input
                      type="number"
                      value={pkg.price}
                      onChange={(e) => {
                        const next = [...draftPackages];
                        next[idx] = { ...pkg, price: Math.max(0, Number(e.target.value) || 0) };
                        setDraftPackages(next);
                      }}
                      className="font-mono mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Benefit &amp; Masa Aktif
                    </label>
                    <input
                      type="text"
                      value={pkg.benefits}
                      onChange={(e) => {
                        const next = [...draftPackages];
                        next[idx] = { ...pkg, benefits: e.target.value };
                        setDraftPackages(next);
                      }}
                      className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="pt-4 text-right md:col-span-1">
                    <button
                      type="button"
                      disabled={draftPackages.length <= 1}
                      aria-label={`Hapus paket ${pkg.name}`}
                      onClick={() => setDraftPackages(draftPackages.filter((_, i) => i !== idx))}
                      className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold text-indigo-700 uppercase">
              Presensi &amp; Kunjungan Studio
            </p>
            <h2 className="font-display mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
              Daftar Kehadiran Member (Scan Barcode / QR Kartu)
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Gunakan kamera perangkat, barcode scanner USB, atau ketik nomor seri kartu untuk mencatat kehadiran member.
            </p>
          </div>
          <button
            type="button"
            onClick={onExportAttendance}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export Kehadiran (.xlsx)</span>
          </button>
        </div>

        {/* Dashboard Kehadiran dengan Filter Rentang Tanggal & Jam Puncak Pengunjung */}
        <div
          data-testid="attendance-dashboard"
          className="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
        >
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h3 className="font-display text-base font-extrabold text-slate-900">
                Dashboard Kehadiran &amp; Jam Puncak Pengunjung
              </h3>
              <p data-testid="dash-active-range-label" className="tabular-nums mt-0.5 text-xs text-slate-500">
                Periode aktif: <span className="font-semibold text-slate-800">{dashboardSummary.rangeLabel}</span>
                {' · '}
                {dashboardSummary.granularity === 'day'
                  ? 'Rincian Harian'
                  : dashboardSummary.granularity === 'week'
                    ? 'Rincian Mingguan'
                    : 'Rincian Bulanan'}
              </p>
            </div>
            <div
              role="group"
              aria-label="Mode Grafik Dashboard Kehadiran"
              className="inline-flex shrink-0 self-start rounded-lg border border-slate-200 bg-white p-1 lg:self-auto"
            >
              <button
                type="button"
                onClick={() => setChartMode('daily')}
                aria-pressed={chartMode === 'daily'}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  chartMode === 'daily'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {dashboardSummary.granularity === 'month'
                    ? 'Per Bulan'
                    : dashboardSummary.granularity === 'week'
                      ? 'Per Minggu'
                      : 'Per Hari'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode('hourly')}
                aria-pressed={chartMode === 'hourly'}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  chartMode === 'hourly'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Jam Puncak (Per Jam)</span>
              </button>
            </div>
          </div>

          {/* Filter Rentang Tanggal & Preset Mingguan/Bulanan */}
          <div
            data-testid="attendance-date-filter"
            className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 xl:flex-row xl:items-end xl:justify-between"
          >
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <CalendarRange className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
                <span>Preset Rentang Cepat</span>
              </p>
              <div
                role="group"
                aria-label="Preset Rentang Tanggal Dashboard"
                className="flex flex-wrap items-center gap-1.5"
              >
                {DATE_PRESETS.map((preset) => {
                  const active = datePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`preset-range-${preset.id}`}
                      aria-pressed={active}
                      onClick={() => applyDatePreset(preset.id)}
                      className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-cyan-700 bg-cyan-700 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2.5">
              <div>
                <label
                  htmlFor="att-filter-start"
                  className="mb-1 block text-[11px] font-semibold text-slate-600"
                >
                  Dari Tanggal
                </label>
                <input
                  id="att-filter-start"
                  data-testid="att-filter-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="font-mono rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="att-filter-end"
                  className="mb-1 block text-[11px] font-semibold text-slate-600"
                >
                  Sampai Tanggal
                </label>
                <input
                  id="att-filter-end"
                  data-testid="att-filter-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="font-mono rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              {datePreset !== '7d' && (
                <button
                  type="button"
                  data-testid="reset-date-filter-btn"
                  onClick={() => applyDatePreset('7d')}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {isReversedRange && (
            <p className="mt-2 text-[11px] font-medium text-amber-700">
              Catatan: Tanggal mulai lebih besar dari tanggal akhir — rentang otomatis diurutkan ({dashboardSummary.startDate} s/d {dashboardSummary.endDate}).
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">
                Check-In Rentang Terpilih ({dashboardSummary.daySpan} Hari)
              </p>
              <p data-testid="dash-7day-total" className="tabular-nums mt-0.5 text-xl font-extrabold text-slate-900">
                {dashboardSummary.totalCount}
                <span className="ml-1.5 text-xs font-semibold text-slate-500">
                  (rata-rata {dashboardSummary.dailyAverage}/hari · {dashboardSummary.uniqueMembersCount} unik)
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">
                {dashboardSummary.granularity === 'month'
                  ? 'Bulan Kunjungan Tersibuk'
                  : dashboardSummary.granularity === 'week'
                    ? 'Minggu Kunjungan Tersibuk'
                    : 'Hari Kunjungan Tersibuk'}
              </p>
              <p data-testid="dash-peak-day" className="tabular-nums mt-0.5 text-xl font-extrabold text-cyan-800">
                {dashboardSummary.peakPeriodLabel}
                <span className="ml-1.5 text-xs font-semibold text-slate-500">
                  ({dashboardSummary.peakPeriodCount} kunjungan)
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">Jam Puncak Pengunjung</p>
              <p data-testid="dash-peak-hour" className="tabular-nums mt-0.5 text-xl font-extrabold text-indigo-700">
                {dashboardSummary.peakHourLabel}
                <span className="ml-1.5 text-xs font-semibold text-slate-500">
                  ({dashboardSummary.peakHourCount} kunjungan)
                </span>
              </p>
            </div>
          </div>

          <div
            data-testid="attendance-barchart"
            className="mt-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-bold text-slate-800">
                {chartMode === 'daily'
                  ? dashboardSummary.granularity === 'month'
                    ? `Grafik Check-In Bulanan · ${dashboardSummary.rangeLabel}`
                    : dashboardSummary.granularity === 'week'
                      ? `Grafik Check-In Mingguan · ${dashboardSummary.rangeLabel}`
                      : `Grafik Check-In Harian · ${dashboardSummary.rangeLabel}`
                  : `Distribusi Jam Kunjungan Studio · ${dashboardSummary.rangeLabel}`}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-xs ${
                      chartMode === 'daily' ? 'bg-cyan-700' : 'bg-indigo-700'
                    }`}
                    aria-hidden="true"
                  />
                  {chartMode === 'daily' ? 'Periode Aktif / Hari Ini' : 'Jam Puncak'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-cyan-600/80" aria-hidden="true" />
                  {chartMode === 'daily' ? 'Periode Lainnya' : 'Jam Reguler'}
                </span>
              </div>
            </div>

            {dashboardSummary.totalCount === 0 ? (
              <div
                data-testid="barchart-empty-state"
                className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center"
              >
                <p className="text-xs font-semibold text-slate-700">
                  Tidak ada check-in pada rentang {dashboardSummary.rangeLabel}.
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Pilih rentang tanggal lain atau reset ke 7 hari terakhir untuk melihat grafik kunjungan.
                </p>
                {datePreset !== '7d' && (
                  <button
                    type="button"
                    onClick={() => applyDatePreset('7d')}
                    className="mt-3 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Reset ke 7 Hari Terakhir
                  </button>
                )}
              </div>
            ) : (
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'daily' ? (
                    <BarChart
                      data={dashboardSummary.periodPoints}
                      margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        minTickGap={18}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<PeriodTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="count" name="Check-In" radius={[6, 6, 0, 0]} maxBarSize={44}>
                        {dashboardSummary.periodPoints.map((entry) => (
                          <Cell
                            key={entry.periodKey}
                            fill={entry.isHighlighted ? '#0e7490' : '#0891b2'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={dashboardSummary.hourlyPoints}
                      margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="hourLabel"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<HourlyTooltip rangeLabel={dashboardSummary.rangeLabel} />}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Bar dataKey="count" name="Kunjungan" radius={[6, 6, 0, 0]} maxBarSize={32}>
                        {dashboardSummary.hourlyPoints.map((entry) => (
                          <Cell
                            key={entry.hour}
                            fill={entry.isPeak ? '#4338ca' : '#0891b2'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Grid Pie Chart Kategori Member & Line Chart Tren Kunjungan */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Pie Chart: Distribusi Kategori Member yang Sering Berkunjung */}
            <div
              data-testid="attendance-piechart"
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 lg:col-span-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <PieChartIcon className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                      Distribusi Kategori Member Berkunjung
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Proporsi paket periode{' '}
                    <span className="whitespace-nowrap font-medium text-slate-700">
                      {dashboardSummary.startDate} – {dashboardSummary.endDate}
                    </span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Teratas</p>
                  <p data-testid="dash-top-category" className="tabular-nums text-xs font-extrabold text-cyan-800">
                    {dashboardSummary.topCategoryLabel} ({dashboardSummary.topCategoryShare}%)
                  </p>
                </div>
              </div>

              {dashboardSummary.categoryPoints.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-600">
                    Belum ada data kategori pada rentang tanggal ini.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Ubah filter tanggal atau lakukan check-in kartu member untuk melihat distribusi.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
                  <div className="h-52 w-full min-w-0 sm:col-span-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardSummary.categoryPoints}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={76}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {dashboardSummary.categoryPoints.map((entry) => (
                            <Cell key={entry.category} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CategoryTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 sm:col-span-6">
                    {dashboardSummary.categoryPoints.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 text-xs last:border-b-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate font-semibold text-slate-800">
                            {item.category}
                          </span>
                        </div>
                        <span className="tabular-nums shrink-0 font-mono text-[11px] font-bold text-slate-700">
                          {item.count}x · {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Line Chart: Tren Kunjungan Member Sesuai Rentang Tanggal */}
            <div
              data-testid="attendance-linechart"
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 lg:col-span-7"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-indigo-700" aria-hidden="true" />
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                      {dashboardSummary.granularity === 'month'
                        ? `Tren Kunjungan Per Bulan (${dashboardSummary.periodPoints.length} Bulan)`
                        : dashboardSummary.granularity === 'week'
                          ? `Tren Kunjungan Mingguan (${dashboardSummary.periodPoints.length} Minggu)`
                          : `Tren Kunjungan Harian (${dashboardSummary.daySpan} Hari)`}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Pergerakan check-in &amp; member unik periode{' '}
                    <span className="whitespace-nowrap font-medium text-slate-700">
                      {dashboardSummary.startDate} – {dashboardSummary.endDate}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Rentang</p>
                    <p data-testid="dash-current-month" className="tabular-nums text-xs font-extrabold text-indigo-700">
                      {dashboardSummary.totalCount} kunjungan
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Puncak</p>
                    <p data-testid="dash-peak-month" className="tabular-nums text-xs font-extrabold text-slate-900">
                      {dashboardSummary.peakPeriodLabel} ({dashboardSummary.peakPeriodCount}x)
                    </p>
                  </div>
                </div>
              </div>

              {dashboardSummary.totalCount === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-600">
                    Belum ada tren kunjungan pada rentang tanggal ini.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Pilih rentang tanggal lain untuk menampilkan kurva tren check-in dan member unik.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-4 bg-indigo-700" aria-hidden="true" />
                      Total Check-In
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-0.5 w-4 border-t-2 border-dashed border-cyan-600"
                        aria-hidden="true"
                      />
                      Member Unik
                    </span>
                  </div>
                  <div className="h-52 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dashboardSummary.periodPoints}
                        margin={{ top: 10, right: 16, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#cbd5e1' }}
                          tickLine={false}
                          minTickGap={18}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<TrendLineTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Total Check-In"
                          stroke="#4338ca"
                          strokeWidth={2.5}
                          dot={
                            dashboardSummary.periodPoints.length <= 16
                              ? { r: 4, fill: '#4338ca', stroke: '#ffffff', strokeWidth: 2 }
                              : false
                          }
                          activeDot={{ r: 6, fill: '#0e7490', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="uniqueMembers"
                          name="Member Unik"
                          stroke="#0891b2"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={
                            dashboardSummary.periodPoints.length <= 16
                              ? { r: 3, fill: '#0891b2', stroke: '#ffffff', strokeWidth: 1.5 }
                              : false
                          }
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-xl bg-slate-900 p-5 text-white sm:p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-cyan-300 uppercase">
                Scanner Kartu Member
              </span>
              <button
                type="button"
                onClick={toggleCamera}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-600"
              >
                {cameraActive ? (
                  <>
                    <Square className="h-3 w-3" aria-hidden="true" />
                    <span>Tutup Kamera</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Buka Kamera Scan</span>
                  </>
                )}
              </button>
            </div>

            {cameraActive && (
              <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-700 bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              </div>
            )}

            <div>
              <label htmlFor="att-purpose" className="mb-1.5 block text-[11px] font-semibold text-slate-300">
                Keperluan Kunjungan di Studio
              </label>
              <select
                id="att-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-white"
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="att-scan-input" className="mb-1.5 block text-[11px] font-semibold text-slate-300">
                Scan Barcode USB / Ketik Nomor Kartu
              </label>
              <div className="flex gap-2">
                <input
                  id="att-scan-input"
                  type="text"
                  value={scanInput}
                  onChange={(e) => handleScanChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') triggerCheckIn(scanInput);
                  }}
                  placeholder="Scan QR / Ketik 0001 atau FS-0001..."
                  className="font-mono flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3.5 py-2.5 text-sm tracking-wider text-white uppercase focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => triggerCheckIn(scanInput)}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Check-In
                </button>
              </div>
            </div>

            {feedback && (
              <div
                className={`rounded-lg border p-3.5 text-xs ${
                  feedback.type === 'ok'
                    ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-100'
                    : feedback.type === 'warn'
                      ? 'border-amber-500/60 bg-amber-950/70 text-amber-100'
                      : 'border-rose-500/60 bg-rose-950/70 text-rose-100'
                }`}
              >
                <p className="font-bold">{feedback.title}</p>
                <p className="mt-1 opacity-90">{feedback.detail}</p>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-semibold text-slate-500">Hadir Hari Ini</p>
                <p data-testid="stat-att-today" className="tabular-nums mt-0.5 text-xl font-extrabold text-cyan-800 sm:text-2xl">
                  {todayCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-semibold text-slate-500">Total Kunjungan</p>
                <p data-testid="stat-att-total" className="tabular-nums mt-0.5 text-xl font-extrabold text-slate-900 sm:text-2xl">
                  {attendanceLogs.length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-semibold text-slate-500">Member Unik</p>
                <p data-testid="stat-att-unique" className="tabular-nums mt-0.5 text-xl font-extrabold text-emerald-700 sm:text-2xl">
                  {uniqueCards}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="att-search-input" className="sr-only">
                  Cari Riwayat Kehadiran
                </label>
                <input
                  id="att-search-input"
                  type="text"
                  value={attSearch}
                  onChange={(e) => setAttSearch(e.target.value)}
                  placeholder="Cari nama member, nomor kartu, atau keperluan..."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs focus:border-cyan-600 focus:outline-none sm:w-64"
                />
                <button
                  type="button"
                  data-testid="toggle-table-date-sync"
                  aria-pressed={syncTableWithDateRange}
                  onClick={() => setSyncTableWithDateRange(!syncTableWithDateRange)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    syncTableWithDateRange
                      ? 'border-cyan-700 bg-cyan-50 text-cyan-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {syncTableWithDateRange
                      ? `Sesuai Tanggal (${dashboardSummary.totalCount})`
                      : 'Semua Riwayat'}
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={onClearLogs}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Log Kehadiran</span>
              </button>
            </div>

            <div className="max-h-[380px] overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                  <tr>
                    <th className="p-3">Waktu Check-In</th>
                    <th className="p-3">No. Kartu</th>
                    <th className="p-3">Nama Member</th>
                    <th className="p-3">Paket</th>
                    <th className="p-3">Keperluan</th>
                    <th className="p-3 text-right">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        Belum ada data kehadiran member yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="font-mono p-3 text-[11px] text-slate-600">{log.timestamp}</td>
                        <td className="font-mono p-3 font-bold text-cyan-800">{log.cardNumber}</td>
                        <td className="p-3 font-semibold text-slate-900">{log.name}</td>
                        <td className="p-3 font-semibold text-indigo-700">{log.category}</td>
                        <td className="p-3 text-slate-700">{log.purpose}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteLog(log.id)}
                            aria-label={`Hapus kunjungan ${log.cardNumber}`}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
