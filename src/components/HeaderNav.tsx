import { Lock } from 'lucide-react';
import type { AppTab } from '../types/studio';

interface HeaderNavProps {
  activeTab: AppTab;
  adminUnlocked: boolean;
  idleSecondsLeft: number;
  onSelectTab: (tab: AppTab) => void;
  onLockAdmin: () => void;
}

const PUBLIC_TABS: { id: AppTab; label: string }[] = [
  { id: 'mass-qr', label: '1. QR Massal' },
  { id: 'register', label: '2. Form Daftar' },
  { id: 'portal', label: '3. Cek Kartu' },
];

const ADMIN_TABS: { id: AppTab; label: string }[] = [
  { id: 'admin', label: '4. Admin Auto-ACC' },
  { id: 'design', label: '5. Cetak CR80' },
  { id: 'excel', label: '6. Data Excel' },
  { id: 'attendance', label: '7. Paket & Kehadiran' },
];

export function HeaderNav({
  activeTab,
  adminUnlocked,
  idleSecondsLeft,
  onSelectTab,
  onLockAdmin,
}: HeaderNavProps) {
  const mins = String(Math.floor(Math.max(0, idleSecondsLeft) / 60)).padStart(2, '0');
  const secs = String(Math.max(0, idleSecondsLeft) % 60).padStart(2, '0');
  const visibleTabs = adminUnlocked ? [...PUBLIC_TABS, ...ADMIN_TABS] : PUBLIC_TABS;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:flex-nowrap lg:gap-8 lg:px-8 lg:py-3">
        <button
          type="button"
          onClick={() => onSelectTab('mass-qr')}
          className="font-display order-1 shrink-0 whitespace-nowrap text-left text-lg font-extrabold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700"
        >
          FARID STUDIO
        </button>

        <nav
          aria-label="Navigasi Utama"
          className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1.5 lg:order-2 lg:w-auto lg:border-t-0 lg:py-1"
        >
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 lg:py-2 ${
                  isActive
                    ? 'bg-cyan-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {adminUnlocked && (
          <div className="order-2 shrink-0 lg:order-3">
            <button
              type="button"
              onClick={onLockAdmin}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 sm:px-4"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="tabular-nums">
                Kunci Admin ({mins}:{secs})
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
