import { useEffect, useState, type FormEvent } from 'react';
import {
  Camera,
  Database,
  Download,
  ExternalLink,
  Layers,
  Loader2,
  Palette,
  Printer,
  Save,
  Search,
} from 'lucide-react';
import type { CardDesignConfig, MemberRecord, PackageConfig, ThemeKey } from '../types/studio';
import { DEFAULT_DESIGN, THEME_PRESETS } from '../utils/cardLogic';
import { renderCr80DataUrl } from '../utils/cardRenderer';

interface DesignStudioTabProps {
  design: CardDesignConfig;
  packages: PackageConfig[];
  members: MemberRecord[];
  onChangeDesign: (next: CardDesignConfig) => void;
  onSaveDesign: () => void;
  onGenerateBatchSlots: (opts: {
    packageId: string;
    prefix: string;
    start: number;
    end: number;
  }) => string[];
  onExportExcelAuto: (filename: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function DesignStudioTab({
  design,
  packages,
  members,
  onChangeDesign,
  onSaveDesign,
  onGenerateBatchSlots,
  onExportExcelAuto,
  onNotify,
}: DesignStudioTabProps) {
  const [previewPkgId, setPreviewPkgId] = useState(packages[0]?.id || 'Umum');
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');

  const [batchPkgId, setBatchPkgId] = useState(packages[0]?.id || 'Umum');
  const [batchPrefix, setBatchPrefix] = useState(packages[0]?.prefix || 'FS');
  const [batchStart, setBatchStart] = useState(1);
  const [batchEnd, setBatchEnd] = useState(10);
  const [autoExportExcel, setAutoExportExcel] = useState(true);
  const [progressMsg, setProgressMsg] = useState('');
  const [printImages, setPrintImages] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState(
    'Tren desain kartu member CR80 foto studio profesional minimalis elegan 2026'
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAnswer, setSearchAnswer] = useState('');
  const [searchSources, setSearchSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let active = true;
    const pkgObj = packages.find((p) => p.id === previewPkgId);
    const sampleNo = `${pkgObj?.prefix || design.serialPrefix || 'FS'}-0001`;
    Promise.all([
      renderCr80DataUrl('front', design, packages, { cardNumber: sampleNo, category: previewPkgId }),
      renderCr80DataUrl('back', design, packages, { cardNumber: sampleNo, category: previewPkgId }),
    ])
      .then(([f, b]) => {
        if (active) {
          setFrontPreview(f);
          setBackPreview(b);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [design, packages, previewPkgId]);

  function handleThemeChange(themeKey: ThemeKey) {
    const preset = THEME_PRESETS[themeKey];
    if (!preset) return;
    onChangeDesign({
      ...design,
      theme: themeKey,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      darkColor: preset.dark,
      ...(themeKey === 'photo-studio-pro'
        ? {
            badgeLabel: 'STUDIO PRO PASS',
            qrLabel: 'SCAN VERIFIKASI MEMBER',
          }
        : themeKey === 'studio-geometric'
          ? {
              badgeLabel: 'KARTU MEMBER',
              qrLabel: 'SCAN DAFTAR MEMBER',
            }
          : {}),
    });
  }

  async function handleRunDesignSearch(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await fetch('/api/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as {
        answer?: string;
        sources?: Array<{ title: string; uri: string }>;
        error?: string;
      };
      if (!res.ok) {
        setSearchError(data.error || 'Gagal mencari referensi desain.');
        return;
      }
      setSearchAnswer(data.answer || '');
      setSearchSources(Array.isArray(data.sources) ? data.sources : []);
    } catch {
      setSearchError('Tidak dapat terhubung ke layanan Google Search.');
    } finally {
      setSearchLoading(false);
    }
  }

  function handleReset() {
    onChangeDesign({ ...DEFAULT_DESIGN });
    onNotify('Pengaturan desain kartu CR80 direset ke standar studio.', 'info');
  }

  async function handleDownloadPreview(side: 'front' | 'back') {
    const pkgObj = packages.find((p) => p.id === previewPkgId);
    const sampleNo = `${pkgObj?.prefix || design.serialPrefix || 'FS'}-0001`;
    const url = await renderCr80DataUrl(side, design, packages, {
      cardNumber: sampleNo,
      category: previewPkgId,
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `DesainCR80_${previewPkgId}_${side}.png`;
    a.click();
  }

  function handleSetNextUnlimited(count: number) {
    const pref = (batchPrefix || 'FS').toUpperCase();
    let maxNum = 0;
    const regex = new RegExp(`^${pref}-(\\d+)$`, 'i');
    members.forEach((m) => {
      const match = m.cardNumber.match(regex);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
    });
    setBatchStart(maxNum + 1);
    setBatchEnd(maxNum + count);
  }

  function handleGenerateSlotsOnly() {
    const created = onGenerateBatchSlots({
      packageId: batchPkgId,
      prefix: batchPrefix,
      start: batchStart,
      end: batchEnd,
    });
    onNotify(`${created.length} nomor kartu otomatis disimpan ke Data Excel Admin!`, 'success');
  }

  async function handleGenerateAndPrint() {
    onSaveDesign();
    const created = onGenerateBatchSlots({
      packageId: batchPkgId,
      prefix: batchPrefix,
      start: batchStart,
      end: batchEnd,
    });
    setProgressMsg(`Menyiapkan ${created.length} kartu CR80 untuk cetak A4...`);
    if (autoExportExcel) {
      onExportExcelAuto(`DataMember_FaridStudio_AutoCetak_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    const rendered: string[] = [];
    for (const cardNo of created) {
      const f = await renderCr80DataUrl('front', design, packages, {
        cardNumber: cardNo,
        category: batchPkgId,
      });
      const b = await renderCr80DataUrl('back', design, packages, {
        cardNumber: cardNo,
        category: batchPkgId,
      });
      rendered.push(f, b);
    }
    setPrintImages(rendered);
    setProgressMsg('');
    setTimeout(() => window.print(), 150);
  }

  return (
    <section aria-label="5. Studio Desain & Cetak Massal CR80" className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-slate-900">
                <Palette className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                <span>Editor Desain Kartu CR80</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Perubahan langsung diterapkan ke pratinjau &amp; cetak massal.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          {/* Preset Cepat Desain Unggulan Studio */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="preset-studio-geometric"
              onClick={() => handleThemeChange('studio-geometric')}
              className={`rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition-colors ${
                design.theme === 'studio-geometric'
                  ? 'border-cyan-700 bg-cyan-50 text-cyan-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Desain Referensi Teal
              <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                Geometris Putih-Teal + QR
              </span>
            </button>
            <button
              type="button"
              data-testid="preset-photo-studio-pro"
              onClick={() => handleThemeChange('photo-studio-pro')}
              className={`flex items-start gap-1.5 rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition-colors ${
                design.theme === 'photo-studio-pro'
                  ? 'border-amber-500 bg-slate-900 text-amber-300'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Photo Studio Pro
                <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                  Editorial Dark &amp; Viewfinder
                </span>
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="des-theme" className="mb-1 block text-[11px] font-bold text-slate-700">
                Tema Desain Kartu
              </label>
              <select
                id="des-theme"
                value={design.theme}
                onChange={(e) => handleThemeChange(e.target.value as ThemeKey)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
              >
                <option value="teal-modern">1. Teal Modern (Biru Putih)</option>
                <option value="studio-geometric">2. Studio Geometric (Sesuai Referensi)</option>
                <option value="photo-studio-pro">3. Photo Studio Pro (Editorial Dark)</option>
                <option value="exclusive-vip">4. Exclusive VIP (Hitam Emas)</option>
                <option value="royal-navy">5. Royal Navy &amp; Gold</option>
                <option value="emerald-prestige">6. Emerald Studio Prestige</option>
                <option value="pearl-minimal">7. Pearl White Minimalist</option>
              </select>
            </div>
            <div>
              <label htmlFor="des-preview-pkg" className="mb-1 block text-[11px] font-bold text-slate-700">
                Pratinjau Paket di Studio
              </label>
              <select
                id="des-preview-pkg"
                value={previewPkgId}
                onChange={(e) => setPreviewPkgId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="des-pkg-disp" className="mb-1 block text-[11px] font-bold text-slate-700">
              Tampilan Paket di Kartu (Umum / Custom)
            </label>
            <input
              id="des-pkg-disp"
              type="text"
              value={design.packageDisplay}
              onChange={(e) => onChangeDesign({ ...design, packageDisplay: e.target.value })}
              placeholder="Kosongkan untuk pakai label paket, atau ketik mis: Member Reguler"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="des-brand" className="mb-1 block text-[11px] font-bold text-slate-700">
                Nama Brand Utama
              </label>
              <input
                id="des-brand"
                type="text"
                value={design.brandTitle}
                onChange={(e) => onChangeDesign({ ...design, brandTitle: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label htmlFor="des-phone" className="mb-1 block text-[11px] font-bold text-slate-700">
                WhatsApp Admin di Kartu (Bisa Diganti)
              </label>
              <input
                id="des-phone"
                type="text"
                value={design.phoneText}
                onChange={(e) => onChangeDesign({ ...design, phoneText: e.target.value })}
                placeholder="+62-8523-097-571"
                className="font-mono w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="des-c1" className="mb-1 block text-[10px] font-bold text-slate-600">
                Warna Utama
              </label>
              <input
                id="des-c1"
                type="color"
                value={design.primaryColor}
                onChange={(e) => onChangeDesign({ ...design, primaryColor: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label htmlFor="des-c2" className="mb-1 block text-[10px] font-bold text-slate-600">
                Warna Aksen
              </label>
              <input
                id="des-c2"
                type="color"
                value={design.accentColor}
                onChange={(e) => onChangeDesign({ ...design, accentColor: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label htmlFor="des-c3" className="mb-1 block text-[10px] font-bold text-slate-600">
                Warna Gelap
              </label>
              <input
                id="des-c3"
                type="color"
                value={design.darkColor}
                onChange={(e) => onChangeDesign({ ...design, darkColor: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="des-title-sz" className="mb-1 block text-[11px] font-bold text-slate-700">
                Ukuran Judul: <span className="tabular-nums">{design.titleSize}</span>px
              </label>
              <input
                id="des-title-sz"
                type="range"
                min={34}
                max={66}
                value={design.titleSize}
                onChange={(e) => onChangeDesign({ ...design, titleSize: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="des-qr-sz" className="mb-1 block text-[11px] font-bold text-slate-700">
                Ukuran QR: <span className="tabular-nums">{design.qrSize}</span>px
              </label>
              <input
                id="des-qr-sz"
                type="range"
                min={115}
                max={210}
                value={design.qrSize}
                onChange={(e) => onChangeDesign({ ...design, qrSize: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="des-badge" className="mb-1 block text-[11px] font-bold text-slate-700">
                Label Pojok Kanan Atas
              </label>
              <input
                id="des-badge"
                type="text"
                value={design.badgeLabel}
                onChange={(e) => onChangeDesign({ ...design, badgeLabel: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label htmlFor="des-prefix" className="mb-1 block text-[11px] font-bold text-slate-700">
                Kode Awalan Seri Default
              </label>
              <input
                id="des-prefix"
                type="text"
                maxLength={8}
                value={design.serialPrefix}
                onChange={(e) =>
                  onChangeDesign({ ...design, serialPrefix: e.target.value.toUpperCase() })
                }
                className="font-mono w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold uppercase"
              />
            </div>
          </div>

          <div>
            <label htmlFor="des-caption" className="mb-1 block text-[11px] font-bold text-slate-700">
              Teks Keterangan Di Dalam Kartu
            </label>
            <input
              id="des-caption"
              type="text"
              value={design.cardCaption}
              onChange={(e) => onChangeDesign({ ...design, cardCaption: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="des-qrlbl" className="mb-1 block text-[11px] font-bold text-slate-700">
                Label Bawah QR
              </label>
              <input
                id="des-qrlbl"
                type="text"
                value={design.qrLabel}
                onChange={(e) => onChangeDesign({ ...design, qrLabel: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label htmlFor="des-backttl" className="mb-1 block text-[11px] font-bold text-slate-700">
                Judul Sisi Belakang
              </label>
              <input
                id="des-backttl"
                type="text"
                value={design.backTitle}
                onChange={(e) => onChangeDesign({ ...design, backTitle: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="des-ig" className="mb-1 block text-[11px] font-bold text-slate-700">
                Instagram
              </label>
              <input
                id="des-ig"
                type="text"
                value={design.instagram}
                onChange={(e) => onChangeDesign({ ...design, instagram: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label htmlFor="des-tag" className="mb-1 block text-[11px] font-bold text-slate-700">
                Hashtag
              </label>
              <input
                id="des-tag"
                type="text"
                value={design.hashtag}
                onChange={(e) => onChangeDesign({ ...design, hashtag: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="des-addr1" className="mb-1 block text-[11px] font-bold text-slate-700">
              Alamat Studio Utama
            </label>
            <input
              id="des-addr1"
              type="text"
              value={design.addressMain}
              onChange={(e) => onChangeDesign({ ...design, addressMain: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label htmlFor="des-addr2" className="mb-1 block text-[11px] font-bold text-slate-700">
              Alamat Cabang
            </label>
            <input
              id="des-addr2"
              type="text"
              value={design.addressBranch}
              onChange={(e) => onChangeDesign({ ...design, addressBranch: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={onSaveDesign}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>Simpan Desain untuk Cetak Massal</span>
          </button>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-extrabold text-slate-900">
                Pratinjau Kartu CR80 (300 DPI)
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPreview('front')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>PNG Depan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPreview('back')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>PNG Belakang</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-slate-500">Tampak Depan</p>
                {frontPreview && (
                  <img
                    src={frontPreview}
                    alt="Pratinjau Sisi Depan CR80"
                    className="w-full rounded-xl border border-slate-200 cr80-card-shadow"
                  />
                )}
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-slate-500">Tampak Belakang</p>
                {backPreview && (
                  <img
                    src={backPreview}
                    alt="Pratinjau Sisi Belakang CR80"
                    className="w-full rounded-xl border border-slate-200 cr80-card-shadow"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <Layers className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>Generator Batch &amp; Cetak Massal A4 (Tak Terbatas)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Nomor seri otomatis masuk ke <strong>6. Data Excel Admin</strong> lengkap dengan jenis desain kartunya.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setBatchStart(1);
                    setBatchEnd(10);
                  }}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                >
                  1–10
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchStart(1);
                    setBatchEnd(100);
                  }}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                >
                  1–100
                </button>
                <button
                  type="button"
                  onClick={() => handleSetNextUnlimited(100)}
                  className="rounded-md bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-800 hover:bg-cyan-100"
                >
                  +100 Seri Berikutnya
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="batch-pkg" className="mb-1 block text-[11px] font-bold text-slate-700">
                  Paket Batch
                </label>
                <select
                  id="batch-pkg"
                  value={batchPkgId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setBatchPkgId(id);
                    const pkg = packages.find((p) => p.id === id);
                    if (pkg) setBatchPrefix(pkg.prefix || 'FS');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="batch-pref" className="mb-1 block text-[11px] font-bold text-slate-700">
                  Kode Awalan
                </label>
                <input
                  id="batch-pref"
                  type="text"
                  maxLength={8}
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                  className="font-mono w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label htmlFor="batch-start" className="mb-1 block text-[11px] font-bold text-slate-700">
                  Nomor Mulai
                </label>
                <input
                  id="batch-start"
                  type="number"
                  min={1}
                  value={batchStart}
                  onChange={(e) => setBatchStart(Math.max(1, Number(e.target.value) || 1))}
                  className="font-mono w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label htmlFor="batch-end" className="mb-1 block text-[11px] font-bold text-slate-700">
                  Nomor Akhir (Bebas)
                </label>
                <input
                  id="batch-end"
                  type="number"
                  min={1}
                  value={batchEnd}
                  onChange={(e) => setBatchEnd(Math.max(1, Number(e.target.value) || 1))}
                  className="font-mono w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            {progressMsg && (
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs font-bold text-cyan-900">
                {progressMsg}
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 font-bold text-emerald-900">
                <input
                  type="checkbox"
                  checked={autoExportExcel}
                  onChange={(e) => setAutoExportExcel(e.target.checked)}
                  className="rounded border-emerald-400 text-emerald-600"
                />
                <span>Otomatis simpan &amp; unduh file Excel (.xlsx) setelah cetak kartu</span>
              </label>
              <span className="hidden text-[11px] font-semibold text-emerald-700 sm:inline">
                Auto-Backup Spreadsheet
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerateSlotsOnly}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <Database className="h-4 w-4" aria-hidden="true" />
                <span>Simpan Slot ke Data Excel</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateAndPrint}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-700 px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-emerald-800"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                <span>Generate, Simpan Excel &amp; Cetak A4 CR80</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print area hidden on screen, rendered cleanly for window.print() */}
      <div id="print-area" className="hidden">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 85.6mm)',
            gap: '4mm',
            justifyContent: 'center',
          }}
        >
          {printImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Kartu CR80 Cetak ${i + 1}`}
              style={{
                width: '85.6mm',
                height: '53.98mm',
                border: '0.2mm solid #cbd5e1',
                borderRadius: '3mm',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
