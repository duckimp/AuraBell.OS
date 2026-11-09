import React from 'react';
import { Bell, LayoutDashboard, Mic2, Music2, CalendarDays, Volume2, GraduationCap, Power, Settings, ExternalLink } from 'lucide-react';
import { isTauri } from '../services/tauriBridge';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  masterVolume: number;
  activeMode: string;
  schoolName: string;
  autoStartEnabled: boolean;
  onToggleAutoStart: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  masterVolume,
  activeMode,
  schoolName,
  autoStartEnabled,
  onToggleAutoStart,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'jadwal',
      label: 'Jadwal Bel',
      icon: Bell,
    },
    {
      id: 'tts',
      label: 'Panggilan Suara',
      icon: Mic2,
    },
    {
      id: 'senam',
      label: 'Senam & Audio',
      icon: Music2,
    },
    {
      id: 'khusus',
      label: 'Jadwal Khusus',
      icon: CalendarDays,
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan Sekolah',
      icon: Settings,
    },
  ];

  const modeLabel: Record<string, { label: string; color: string }> = {
    reguler: { label: 'Reguler', color: 'bg-primary text-on-primary' },
    ujian: { label: 'Ujian', color: 'bg-secondary text-on-secondary' },
    ramadan: { label: 'Ramadan', color: 'bg-tertiary-container text-on-tertiary-fixed' },
  };
  const mode = modeLabel[activeMode] || modeLabel['reguler'];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.06)] z-50 flex flex-col justify-between overflow-y-auto border-r border-outline-variant/20 select-none">
      <div className="p-space-lg flex flex-col gap-space-md">
        {/* App Branding */}
        <div className="flex items-center gap-space-sm pb-4 border-b border-surface-container-low">
          <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shadow-sm ring-2 ring-primary/10 shrink-0">
            <Bell className="w-6 h-6 text-primary-fixed" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
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
        <div className="bg-surface-container-low px-3 py-2.5 rounded-xl flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">Mode jadwal</span>
          <span className={`font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-[11px] shadow-sm ${mode.color}`}>
            {mode.label}
          </span>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-all duration-150 text-left cursor-pointer group ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface'
                }`}>
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="flex min-w-0 items-center">
                  <span className={`text-sm font-semibold leading-tight ${isActive ? 'text-on-primary' : ''}`}>
                    {item.label}
                  </span>
                </div>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-fixed opacity-80" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Speaker / Hardware Status Widget */}
      <div className="p-4 m-4 mt-0">
        <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-on-surface font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-primary" />
              Volume master
            </span>
            <span className="font-mono font-bold text-sm text-primary">{masterVolume}%</span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${masterVolume}%` }} />
          </div>
          {isTauri() && (
            <button
              onClick={onToggleAutoStart}
              className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <Power className="w-4 h-4" />
                Mulai saat login
              </span>
              <span>{autoStartEnabled ? 'Aktif' : 'Mati'}</span>
            </button>
          )}
        </div>
        <div className="mt-4 border-t border-outline-variant/20 pt-3 text-center">
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
