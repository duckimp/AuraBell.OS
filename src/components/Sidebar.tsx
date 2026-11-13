import React from 'react';
import { Bell, LayoutDashboard, Mic2, Music2, CalendarDays, Volume2, GraduationCap, Power, Settings, ExternalLink, LogOut } from 'lucide-react';

interface SidebarProps {
  isDesktop: boolean;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  masterVolume: number;
  activeMode: string;
  schoolName: string;
  autoStartEnabled: boolean;
  onToggleAutoStart: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isDesktop,
  currentTab,
  setCurrentTab,
  masterVolume,
  activeMode,
  schoolName,
  autoStartEnabled,
  onToggleAutoStart,
  onSignOut,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      mobileVisible: true,
    },
    {
      id: 'jadwal',
      label: 'Jadwal Bel',
      icon: Bell,
      mobileVisible: false,
    },
    {
      id: 'tts',
      label: 'Panggilan Suara',
      icon: Mic2,
      mobileVisible: true,
    },
    {
      id: 'senam',
      label: 'Senam & Audio',
      icon: Music2,
      mobileVisible: true,
    },
    {
      id: 'khusus',
      label: 'Jadwal Khusus',
      icon: CalendarDays,
      mobileVisible: false,
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan Sekolah',
      icon: Settings,
      mobileVisible: false,
    },
  ];
  const visibleNavItems = navItems.filter((item) =>
    isDesktop ? item.id !== 'tts' : item.id === 'tts' || item.id === 'senam'
  );

  const modeLabel: Record<string, { label: string; color: string }> = {
    reguler: { label: 'Reguler', color: 'bg-primary text-on-primary' },
    ujian: { label: 'Ujian', color: 'bg-secondary text-on-secondary' },
    ramadan: { label: 'Ramadan', color: 'bg-tertiary-container text-on-tertiary-fixed' },
  };
  const mode = modeLabel[activeMode] || modeLabel['reguler'];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 max-[1100px]:w-20 max-[700px]:top-auto max-[700px]:bottom-14 max-[700px]:h-14 max-[700px]:w-full bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.06)] z-50 flex flex-col max-[700px]:flex-row justify-between overflow-y-auto max-[700px]:overflow-visible border-r border-outline-variant/20 max-[700px]:border-r-0 max-[700px]:border-t select-none">
      <div className="p-space-lg max-[1100px]:p-3 max-[700px]:h-full max-[700px]:flex-1 max-[700px]:p-1 flex flex-col max-[700px]:flex-row gap-space-md max-[1100px]:gap-3 max-[700px]:gap-0">
        {/* App Branding */}
        <div className="flex items-center gap-space-sm pb-4 border-b border-surface-container-low max-[1100px]:justify-center max-[1100px]:pb-3 max-[700px]:hidden">
          <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shadow-sm ring-2 ring-primary/10 shrink-0">
            <Bell className="w-6 h-6 text-primary-fixed" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0 max-[1100px]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-headline font-extrabold text-[17px] text-primary tracking-tight leading-tight">
                AuraBell<span className="text-on-surface-variant font-semibold">.OS</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
              <GraduationCap className="w-3 h-3 text-secondary shrink-0" />
              <span className="truncate">{schoolName}</span>
            </div>
          </div>
        </div>

        {/* Current Active Mode Tag */}
        <div title={`Mode jadwal: ${mode.label}`} className="bg-surface-container-low px-3 py-2.5 rounded-xl flex items-center justify-between max-[1100px]:justify-center max-[1100px]:px-1 max-[700px]:hidden">
          <span className="text-sm font-semibold text-on-surface max-[1100px]:hidden">Mode jadwal</span>
          <span className={`font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-[11px] shadow-sm ${mode.color} max-[1100px]:px-1.5`}>
            {mode.label}
          </span>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1 pt-1 max-[1100px]:items-center max-[700px]:h-full max-[700px]:w-full max-[700px]:flex-row max-[700px]:justify-around max-[700px]:gap-0 max-[700px]:pt-0">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-all duration-150 text-left cursor-pointer group ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                } max-[1100px]:w-12 max-[1100px]:justify-center max-[1100px]:px-1 max-[700px]:h-12 max-[700px]:w-12 max-[700px]:flex-1 max-[700px]:rounded-lg max-[700px]:px-0 ${
                  item.mobileVisible ? '' : 'max-[700px]:hidden'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface'
                }`}>
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="flex min-w-0 items-center max-[1100px]:hidden">
                  <span className={`text-sm font-semibold leading-tight ${isActive ? 'text-on-primary' : ''}`}>
                    {item.label}
                  </span>
                </div>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-fixed opacity-80 max-[1100px]:hidden" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onSignOut}
            title="Keluar akun"
            aria-label="Keluar akun"
            className="hidden max-[700px]:flex h-12 w-12 flex-1 items-center justify-center rounded-xl text-on-surface-variant hover:bg-error-container hover:text-error"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </div>

      <div className="p-4 m-4 mt-0 max-[1100px]:p-2 max-[1100px]:m-2 max-[700px]:hidden">
        {isDesktop && (
          <div className="mb-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-3">
            <div title={`Volume master: ${masterVolume}%`} className="flex items-center justify-between max-[1100px]:justify-center">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                <Volume2 className="h-3.5 w-3.5 text-primary" />
                <span className="max-[1100px]:hidden">Volume master</span>
              </span>
              <span className="font-mono text-sm font-bold text-primary max-[1100px]:hidden">{masterVolume}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${masterVolume}%` }} />
            </div>
            <button
              onClick={onToggleAutoStart}
              title={`Mulai saat login: ${autoStartEnabled ? 'Aktif' : 'Mati'}`}
              className="mt-2 flex w-full items-center justify-between gap-2 border-t border-outline-variant/20 pt-2 text-sm font-semibold text-on-surface-variant hover:text-primary"
            >
              <span className="flex items-center gap-2 max-[1100px]:justify-center">
                <Power className="h-4 w-4" />
                <span className="max-[1100px]:hidden">Mulai saat login</span>
              </span>
              <span className="max-[1100px]:hidden">{autoStartEnabled ? 'Aktif' : 'Mati'}</span>
            </button>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-error"
        >
          <LogOut className="h-4 w-4" />
          <span className="max-[1100px]:hidden">Keluar akun</span>
        </button>
        <div className="mt-4 border-t border-outline-variant/20 pt-3 text-center max-[1100px]:hidden">
          <span className="text-xs text-on-surface-variant">Dibuat oleh </span>
          <a
            href="https://github.com/duckimp"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Andi Mariono
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
};
