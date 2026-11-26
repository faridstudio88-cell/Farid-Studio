import { useEffect, useState } from 'react';
import { Copy, Download, ShieldCheck, UserPlus } from 'lucide-react';
import { generateQrDataUrl, renderMassQrPosterDataUrl } from '../utils/cardRenderer';

interface MassQrTabProps {
  registrationUrl: string;
  addressMain: string;
  onCopyUrl: () => void;
  onOpenRegister: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function MassQrTab({
  registrationUrl,
  addressMain,
  onCopyUrl,
  onOpenRegister,
  onNotify,
}: MassQrTabProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    generateQrDataUrl(registrationUrl, 220)
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [registrationUrl]);

  async function handleDownloadPoster() {
    try {
      const posterUrl = await renderMassQrPosterDataUrl(registrationUrl, addressMain);
      const link = document.createElement('a');
      link.download = 'Poster_QR_Massal_FaridStudio.png';
      link.href = posterUrl;
      link.click();
      onNotify('Poster QR Massal Daftar Member berhasil diunduh!', 'success');
    } catch {
      onNotify('Gagal membuat poster QR.', 'error');
    }
  }

  return (
    <section aria-label="1. QR Massal Pendaftaran" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
      <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col justify-between space-y-6 lg:col-span-7">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-wide text-cyan-800 uppercase">
              QR Massal Khusus Pendaftaran &amp; Menjadi Member Baru
            </p>
            <h1 className="font-display max-w-2xl text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl [text-wrap:balance]">
              1 QR Massal Khusus Daftar &amp; Jadi Member Studio
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              Pajang satu QR Code ini di meja kasir, backdrop studio, atau brosur resmi. QR Massal ini dikhususkan <strong className="font-semibold text-slate-900">hanya untuk pelanggan baru yang ingin mendaftar dan menjadi member resmi Farid Studio</strong>. Sistem otomatis memblokir daftar ulang jika nomor kartu atau nomor WhatsApp sudah aktif.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 border-y border-slate-200 py-5 sm:grid-cols-3">
            <div>
              <p className="font-mono text-xs font-bold text-cyan-700">01.</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Scan QR Daftar</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Pindai QR Massal di meja studio untuk langsung membuka formulir member baru.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-cyan-700">02.</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Isi Data &amp; Seri Kartu</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Masukkan nomor kartu baru, nama lengkap, dan nomor WhatsApp aktif Anda.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-emerald-700">03.</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Resmi Jadi Member</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Status langsung menjadi <strong className="font-semibold text-emerald-700">AKTIF</strong> dan kartu tidak dapat didaftarkan ulang.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 text-xs text-cyan-950">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
            <div>
              <p className="font-bold">Fokus Khusus Member Baru &amp; Anti Daftar Ulang</p>
              <p className="mt-1 leading-relaxed text-cyan-900">
                QR Massal tidak digunakan untuk cek kartu atau absensi kunjungan. Pelanggan yang sudah menjadi member cukup menunjukkan kartu di menu <strong>Cek Kartu</strong> agar tidak terjadi pendaftaran ganda.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="mass-qr-url-input" className="block text-xs font-bold text-slate-700">
              URL QR Massal (Khusus Daftar &amp; Jadi Member)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="mass-qr-url-input"
                type="text"
                readOnly
                value={registrationUrl}
                className="font-mono flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700"
              />
              <button
                type="button"
                onClick={onCopyUrl}
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Salin Link Daftar</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onOpenRegister}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Daftar &amp; Jadi Member Sekarang</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPoster}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Unduh Poster QR Daftar (PNG)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900 p-8 text-center text-white lg:col-span-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
            FARID STUDIO MULTIMEDIA
          </p>
          <h2 className="font-display mt-1.5 text-xl font-extrabold tracking-tight text-white">
            SCAN QR DAFTAR &amp; JADI MEMBER
          </h2>
          <p className="mt-1 text-[11px] font-semibold text-emerald-300">
            Hanya untuk pendaftaran member baru (1x per nomor &amp; kartu)
          </p>
          <div className="mt-6 rounded-xl bg-white p-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Massal Khusus Daftar Member Baru Farid Studio"
                className="h-48 w-48 object-contain"
              />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center text-xs text-slate-400">
                Memuat QR...
              </div>
            )}
          </div>
          <p className="mt-6 max-w-xs text-xs leading-relaxed text-slate-300">
            Scan QR di atas dengan kamera HP Anda untuk langsung mengisi formulir pendaftaran dan resmi menjadi member <strong className="font-semibold text-white">AKTIF</strong>.
          </p>
        </div>
      </div>
    </section>
  );
}
