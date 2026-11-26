import { useEffect, useState } from 'react';
import { Download, FileDown, Search } from 'lucide-react';
import type {
  CardDesignConfig,
  MemberRecord,
  PackageConfig,
  StudioBranchLocation,
} from '../types/studio';
import { normalizeCardNumber } from '../utils/cardLogic';
import { renderCr80DataUrl } from '../utils/cardRenderer';
import { generateMemberCr80Pdf } from '../utils/cr80Pdf';
import { StudioMapSection } from './StudioMapSection';

interface PortalTabProps {
  members: MemberRecord[];
  design: CardDesignConfig;
  packages: PackageConfig[];
  branches: StudioBranchLocation[];
  adminUnlocked?: boolean;
  onUpdateBranch?: (
    branchId: StudioBranchLocation['id'],
    patch: {
      title?: string;
      subtitle?: string;
      address?: string;
      hours?: string;
      lat?: number;
      lng?: number;
    }
  ) => void;
  onResetBranches?: () => void;
  prefilledQuery?: string;
  mapsQuotaExceeded?: boolean;
}

export function PortalTab({
  members,
  design,
  packages,
  branches,
  adminUnlocked = false,
  onUpdateBranch,
  onResetBranches,
  prefilledQuery = '',
  mapsQuotaExceeded = false,
}: PortalTabProps) {
  const [query, setQuery] = useState(prefilledQuery);
  const [frontImg, setFrontImg] = useState('');
  const [backImg, setBackImg] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (prefilledQuery) {
      setQuery(prefilledQuery);
    }
  }, [prefilledQuery]);

  const normalized = normalizeCardNumber(query, design.serialPrefix || 'FS');
  const matchedMember = normalized
    ? members.find((m) => m.cardNumber.toUpperCase() === normalized.toUpperCase())
    : undefined;

  useEffect(() => {
    let active = true;
    if (!matchedMember) {
      setFrontImg('');
      setBackImg('');
      return;
    }
    Promise.all([
      renderCr80DataUrl('front', design, packages, {
        cardNumber: matchedMember.cardNumber,
        category: matchedMember.category,
      }),
      renderCr80DataUrl('back', design, packages, {
        cardNumber: matchedMember.cardNumber,
        category: matchedMember.category,
      }),
    ])
      .then(([f, b]) => {
        if (active) {
          setFrontImg(f);
          setBackImg(b);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [matchedMember, design, packages]);

  async function handleDownload(side: 'front' | 'back') {
    if (!matchedMember) return;
    const url = await renderCr80DataUrl(side, design, packages, {
      cardNumber: matchedMember.cardNumber,
      category: matchedMember.category,
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `KartuMember_${matchedMember.cardNumber}_${side}.png`;
    a.click();
  }

  async function handleDownloadCr80Pdf() {
    if (!matchedMember) return;
    setPdfBusy(true);
    try {
      await generateMemberCr80Pdf({
        member: matchedMember,
        design,
        packages,
        format: 'a4-sheet',
        frontDataUrl: frontImg || undefined,
        backDataUrl: backImg || undefined,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section aria-label="3. Cek Kartu Member" className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mx-auto mb-6 max-w-xl text-center">
          <p className="text-xs font-semibold text-cyan-800 uppercase">Portal Resmi Pemilik Kartu</p>
          <h2 className="font-display mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
            Cek Keaslian &amp; Kartu Digital Member
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
            Masukkan nomor seri kartu Anda (misalnya <code className="font-mono font-bold text-cyan-800">FS-0001</code> atau <code className="font-mono font-bold text-cyan-800">0001</code>) untuk menampilkan data asli kartu member aktif dan desain kartu digital 2 sisi.
          </p>
        </div>

        <div className="mx-auto mb-6 flex max-w-lg flex-col gap-3 sm:flex-row">
          <label htmlFor="portal-card-input" className="sr-only">
            Nomor Seri Kartu Member
          </label>
          <input
            id="portal-card-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Masukkan Nomor Kartu (Contoh: 0001 / FS-0001)"
            className="font-mono flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm tracking-wider uppercase focus:border-cyan-700 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQuery(query.trim())}
            className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-cyan-700 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tampilkan Kartu</span>
          </button>
        </div>

        {!matchedMember ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-xs text-slate-500">
            {normalized
              ? `Nomor seri kartu ${normalized} belum terdaftar dalam sistem.`
              : 'Ketik nomor seri kartu untuk menampilkan identitas asli member dan kartu digital CR80 2 sisi.'}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 border-y border-slate-200 py-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`font-extrabold ${
                      matchedMember.status === 'AKTIF' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {matchedMember.status}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="font-mono text-sm font-bold text-cyan-800">
                    {matchedMember.cardNumber}
                  </span>
                </div>
                <h3 className="font-display text-lg font-extrabold text-slate-900">
                  {matchedMember.name}
                </h3>
                <p className="text-xs text-slate-600">
                  Paket: {matchedMember.category} · WA: {matchedMember.phone} · Instansi:{' '}
                  {matchedMember.org || '-'} · Aktif: {matchedMember.registeredAt || '-'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCr80Pdf}
                  disabled={pdfBusy}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:bg-slate-400"
                >
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{pdfBusy ? 'Membuat PDF...' : 'PDF CR80 Siap Cetak'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('front')}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-cyan-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>PNG Depan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('back')}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>PNG Belakang</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">Sisi Depan Kartu Member</p>
                {frontImg && (
                  <img
                    src={frontImg}
                    alt={`Sisi Depan Kartu ${matchedMember.cardNumber}`}
                    className="w-full rounded-xl border border-slate-200 cr80-card-shadow"
                  />
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">Sisi Belakang Kartu Member</p>
                {backImg && (
                  <img
                    src={backImg}
                    alt={`Sisi Belakang Kartu ${matchedMember.cardNumber}`}
                    className="w-full rounded-xl border border-slate-200 cr80-card-shadow"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <StudioMapSection quotaExceeded={mapsQuotaExceeded} />
    </div>
  );
}
