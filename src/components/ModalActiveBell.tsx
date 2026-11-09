import React, { useEffect, useState } from 'react';
import { Bell, Volume2, AlertTriangle, Square, X } from 'lucide-react';
import { BellTriggerPayload } from '../types';

interface ModalActiveBellProps {
  payload: BellTriggerPayload | null;
  onClose: () => void;
  onStopBell: () => void;
}

export const ModalActiveBell: React.FC<ModalActiveBellProps> = ({
  payload,
  onClose,
  onStopBell,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!payload) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [payload]);

  if (!payload) return null;

  const isEmergency = payload.is_emergency;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl p-space-lg shadow-2xl border flex flex-col items-center text-center relative overflow-hidden ${
          isEmergency
            ? 'bg-red-950/90 text-white border-red-500'
            : 'bg-surface-container-lowest text-on-surface border-primary/30'
        }`}
      >
        {/* Close icon at top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pulsing Bell Icon & Waves */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated Expanding Rings */}
          <div
            className={`absolute w-32 h-32 rounded-full animate-ping opacity-30 ${
              isEmergency ? 'bg-red-500' : 'bg-primary'
            }`}
          ></div>
          <div
            className={`absolute w-44 h-44 rounded-full animate-pulse opacity-15 ${
              isEmergency ? 'bg-red-400' : 'bg-primary-fixed'
            }`}
          ></div>

          {/* Central Bell Circle */}
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg relative z-10 ${
              isEmergency
                ? 'bg-red-600 text-white animate-bounce'
                : 'bg-primary text-on-primary'
            }`}
          >
            {isEmergency ? (
              <AlertTriangle className="w-12 h-12" />
            ) : (
              <Bell className="w-12 h-12 animate-[wiggle_1s_ease-in-out_infinite]" />
            )}
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`w-2.5 h-2.5 rounded-full animate-ping ${
              isEmergency ? 'bg-red-400' : 'bg-primary'
            }`}
          ></span>
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isEmergency ? 'text-red-300' : 'text-primary'
            }`}
          >
            {isEmergency ? 'SIRINE DARURAT MENGUDARA' : 'BEL SEKOLAH SEDANG BERBUNYI'}
          </span>
        </div>

        {/* Bell Title */}
        <h2 className="font-headline font-extrabold text-2xl tracking-tight mb-1">
          {payload.title}
        </h2>

        {/* Details: Time & File */}
        <p className="text-xs text-on-surface-variant font-medium mb-4">
          Waktu: <strong>{payload.time} WIB</strong> • Audio:{' '}
          <span className="font-mono">
            {payload.audio_type === 'tts' ? 'Pengumuman TTS' : payload.audio_file}
          </span>
        </p>

        {/* Soundwave Simulation Bar */}
        <div className="w-full h-12 bg-surface-container-low rounded-xl flex items-center justify-center gap-1.5 px-4 mb-6 overflow-hidden">
          {[20, 50, 80, 100, 70, 90, 40, 60, 95, 80, 50, 75, 100, 60, 40, 80, 30].map(
            (val, i) => (
              <div
                key={i}
                style={{
                  height: `${Math.max(20, Math.sin((elapsed + i) * 0.8) * 40 + 50)}%`,
                  transition: 'height 0.2s ease',
                }}
                className={`w-1.5 rounded-full ${
                  isEmergency ? 'bg-red-500' : 'bg-primary'
                }`}
              />
            )
          )}
        </div>

        {/* Action: Stop Bell */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => {
              onStopBell();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-error hover:bg-red-700 text-white font-headline font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Hentikan Bel Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
