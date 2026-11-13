import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Power,
} from 'lucide-react';

interface HeaderProps {
  academicYear: string;
  schoolName: string;
  autoBellEnabled: boolean;
  activeMode: string;
  isDesktop: boolean;
  onToggleAutoBell: () => void;
  onEmergencyTrigger: () => void;
}

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export const Header: React.FC<HeaderProps> = ({
  academicYear,
  schoolName,
  autoBellEnabled,
  activeMode,
  isDesktop,
  onToggleAutoBell,
  onEmergencyTrigger,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);
      setDateStr(`${DAYS_ID[now.getDay()]}, ${now.getDate()} ${MONTHS_ID[now.getMonth()]} ${now.getFullYear()}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-72 max-[1100px]:left-20 max-[700px]:left-0 right-0 h-16 max-[700px]:h-16 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_6px_rgba(0,0,0,0.05)] border-b border-outline-variant/20 z-40 px-6 max-[1100px]:px-3 max-[700px]:px-2 flex items-center justify-between gap-2 max-[700px]:gap-1 select-none">
      {/* Left Info */}
      <div className="flex min-w-0 items-center gap-3 max-[1100px]:gap-2 max-[700px]:gap-1">
        {/* Academic Year + School badge */}
        <div className="flex min-w-0 flex-col bg-surface-container-low px-3 py-1.5 rounded-lg max-[1100px]:px-2 max-[700px]:bg-transparent max-[700px]:px-1 max-[700px]:py-1">
          <span className="max-[1100px]:hidden text-sm font-semibold text-on-surface truncate">{schoolName}</span>
          <span className="hidden max-[700px]:block text-xs font-semibold text-on-surface truncate">Andi Mariono</span>
          <span className="text-xs max-[700px]:hidden text-on-surface-variant">{academicYear}</span>
          <span className="hidden max-[700px]:block text-[10px] font-semibold uppercase text-primary">
            Mode {activeMode}
          </span>
        </div>

        {isDesktop && (
          <button
            onClick={onToggleAutoBell}
            title="Klik untuk mengaktifkan/menonaktifkan penjadwalan otomatis"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border max-[700px]:gap-1 max-[700px]:px-2 max-[700px]:py-2 ${
              autoBellEnabled
                ? 'bg-primary/8 border-primary/20 text-primary hover:bg-primary/12'
                : 'bg-error-container/60 border-error/20 text-error hover:bg-error-container'
            }`}
          >
            {autoBellEnabled ? (
              <>
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-primary" />
                </span>
                <CheckCircle2 className="w-4 h-4" />
                <span className="max-[1100px]:hidden">Bel otomatis · {activeMode === 'reguler' ? 'Reguler' : activeMode === 'ujian' ? 'Ujian' : 'Ramadan'}</span>
                <span className="hidden max-[1100px]:inline max-[700px]:hidden">Otomatis</span>
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" />
                <span className="max-[1100px]:hidden">Bel otomatis mati</span>
                <span className="hidden max-[1100px]:inline max-[700px]:hidden">Mati</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-3 max-[1100px]:gap-2 max-[700px]:gap-1">
        {/* Real-time Clock */}
        <div className="hidden min-[1101px]:flex flex-col text-right items-end pr-3 border-r border-outline-variant/30">
          <div className="flex items-center gap-1.5 font-mono font-bold text-[15px] text-on-surface tabular-nums tracking-wider">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{timeStr}</span>
            <span className="text-[11px] font-semibold text-on-surface-variant ml-0.5">WIB</span>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">{dateStr}</span>
        </div>

        {isDesktop && (
          <button
            onClick={onEmergencyTrigger}
            title="Darurat: Bunyikan Bel"
            className="flex items-center gap-2 bg-error text-on-error hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all duration-150 cursor-pointer active:scale-95 max-[700px]:px-2 max-[700px]:py-2"
            type="button"
          >
            <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
            <span className="max-[1100px]:hidden">Darurat: Bunyikan Bel</span>
          </button>
        )}

      </div>
    </header>
  );
};
