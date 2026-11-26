import { useState, type ChangeEvent } from 'react';
import { FileDown, FileUp, Plus, Trash2 } from 'lucide-react';
import type { CardDesignConfig, MemberRecord } from '../types/studio';
import { getCardDesignLabel } from '../utils/cardLogic';

interface ExcelDatabaseTabProps {
  members: MemberRecord[];
  design: CardDesignConfig;
  onUpdateCell: (index: number, field: keyof MemberRecord, value: string) => void;
  onDeleteRow: (index: number) => void;
  onClearAll: () => void;
  onAddRow: () => void;
  onExportExcel: () => void;
  onImportExcel: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function ExcelDatabaseTab({
  members,
  design,
  onUpdateCell,
  onDeleteRow,
  onClearAll,
  onAddRow,
  onExportExcel,
  onImportExcel,
}: ExcelDatabaseTabProps) {
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = members
    .map((m, idx) => ({ m, idx }))
    .filter(
      ({ m }) =>
        !q ||
        m.cardNumber.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.cardDesign && m.cardDesign.toLowerCase().includes(q)) ||
        (m.nik && m.nik.includes(q))
    );

  return (
    <section
      aria-label="6. Data Excel Member"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold text-emerald-700 uppercase">
            Spreadsheet Database Terkoneksi Real-Time
          </p>
          <h2 className="font-display mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
            Data Excel Member &amp; Keluaran Cetak (Khusus Admin)
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Edit sel secara langsung seperti Microsoft Excel, impor dari file `.xlsx`, atau ekspor seluruh database ke `.xlsx`.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800">
            <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Import Excel (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onImportExcel}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={members.length === 0}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hapus Semua</span>
          </button>
        </div>
      </div>

      {confirmClear && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 sm:flex-row sm:items-center">
          <p className="text-xs text-rose-900">
            Yakin ingin menghapus <strong>SELURUH ({members.length}) data member</strong> di tabel Excel ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setConfirmClear(false);
              }}
              className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Ya, Hapus Semua Data
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <label htmlFor="excel-search-input" className="sr-only">
          Cari di Spreadsheet Member
        </label>
        <input
          id="excel-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor kartu, nama, WA, desain, atau NIK..."
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs focus:border-emerald-700 focus:outline-none sm:w-80"
        />
        <button
          type="button"
          onClick={onAddRow}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-cyan-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-800"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Tambah Baris Member Baru</span>
        </button>
      </div>

      <div className="max-h-[520px] overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1150px] border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-emerald-200 bg-emerald-50 text-[11px] font-bold tracking-wider text-emerald-950 uppercase">
            <tr>
              <th className="p-3">No. Kartu</th>
              <th className="p-3">Nama Lengkap</th>
              <th className="p-3">No. WhatsApp</th>
              <th className="p-3">Paket</th>
              <th className="p-3">Jenis Desain Kartu</th>
              <th className="p-3">Instansi / Kampus</th>
              <th className="p-3">NIK KTP</th>
              <th className="p-3">No. KK</th>
              <th className="p-3">Status</th>
              <th className="p-3">Catatan</th>
              <th className="p-3 text-right">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-slate-400">
                  Tidak ada baris data member di spreadsheet.
                </td>
              </tr>
            ) : (
              filtered.map(({ m, idx }) => (
                <tr key={`${m.cardNumber}-${idx}`} className="hover:bg-emerald-50/40">
                  <td className="p-2">
                    <input
                      aria-label={`Nomor Kartu baris ${idx + 1}`}
                      type="text"
                      defaultValue={m.cardNumber}
                      onBlur={(e) => {
                        if (e.target.value !== m.cardNumber) {
                          onUpdateCell(idx, 'cardNumber', e.target.value);
                        }
                      }}
                      className="font-mono w-24 rounded border border-slate-200 px-2 py-1 font-bold text-cyan-800"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`Nama Lengkap ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.name}
                      onBlur={(e) => {
                        if (e.target.value !== m.name) onUpdateCell(idx, 'name', e.target.value);
                      }}
                      className="w-40 rounded border border-slate-200 px-2 py-1 font-semibold"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`WhatsApp ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.phone || ''}
                      onBlur={(e) => onUpdateCell(idx, 'phone', e.target.value)}
                      className="font-mono w-32 rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`Paket ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.category || ''}
                      onBlur={(e) => onUpdateCell(idx, 'category', e.target.value)}
                      className="w-24 rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`Desain ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.cardDesign || getCardDesignLabel(design.theme)}
                      onBlur={(e) => onUpdateCell(idx, 'cardDesign', e.target.value)}
                      className="w-44 rounded border border-slate-200 px-2 py-1 font-semibold text-indigo-700"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`Instansi ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.org || ''}
                      onBlur={(e) => onUpdateCell(idx, 'org', e.target.value)}
                      className="w-32 rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`NIK ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.nik || ''}
                      onBlur={(e) => onUpdateCell(idx, 'nik', e.target.value)}
                      className="font-mono w-36 rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`Nomor KK ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.kkNumber || ''}
                      onBlur={(e) => onUpdateCell(idx, 'kkNumber', e.target.value)}
                      className="font-mono w-36 rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      aria-label={`Status ${m.cardNumber}`}
                      value={m.status}
                      onChange={(e) => onUpdateCell(idx, 'status', e.target.value)}
                      className={`rounded border border-slate-200 px-2 py-1 font-bold ${
                        m.status === 'AKTIF'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="BELUM_AKTIF">BELUM_AKTIF</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`Catatan ${m.cardNumber}`}
                      type="text"
                      defaultValue={m.notes || ''}
                      onBlur={(e) => onUpdateCell(idx, 'notes', e.target.value)}
                      className="w-36 rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(idx)}
                      aria-label={`Hapus baris ${m.cardNumber}`}
                      className="p-1 text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
