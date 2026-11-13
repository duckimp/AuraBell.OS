import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Clock,
  Play,
  Pause,
  Volume2,
  Mic2,
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCircle,
  Radio,
  Send,
  Dumbbell,
  CheckCircle2,
  CircleAlert,
  History,
  ShieldAlert,
  SkipForward,
  X,
} from 'lucide-react';
import { AppData, ScheduleItem, AudioTrack, BellHistoryRecord, TargetCategory } from '../types';
import { audioEngine, TtsEngine, VoiceGender } from '../services/audioEngine';
import { isTauri } from '../services/tauriBridge';
import { RemoteReceiverStatus } from '../services/remoteAnnouncements';

interface DashboardViewProps {
  appData: AppData;
  canPlayBell: boolean;
  isBellPlaybackActive: boolean;
  onTriggerBell: (title: string, audioFile: string, category?: string) => void;
  onTestBellAudio: () => void;
  onPreviewEmergencyAudio: () => void;
  onSkipNextBell: (schedule: { id: string; date: string; time: string }) => Promise<void>;
  skipOccurrenceKey: string | null;
  remoteReceiverEnabled: boolean;
  remoteReceiverStatus: RemoteReceiverStatus;
  onSendTts: (
    targetType: TargetCategory,
    name: string,
    location: string,
    message: string,
    onComplete?: () => void
  ) => void;
  onSelectTrack: (track: AudioTrack) => void;
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  ttsEngine: TtsEngine;
  isPlayingMusic: boolean;
  currentTrack: AudioTrack | null;
  onTogglePlayMusic: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  appData,
  canPlayBell,
  isBellPlaybackActive,
  onTriggerBell,
  onTestBellAudio,
  onPreviewEmergencyAudio,
  onSkipNextBell,
  skipOccurrenceKey,
  remoteReceiverEnabled,
  remoteReceiverStatus,
  onSendTts,
  onSelectTrack,
  voiceGender,
  onVoiceGenderChange,
  ttsEngine,
  isPlayingMusic,
  currentTrack,
  onTogglePlayMusic,
}) => {
  // Quick TTS Form state
  const [quickTarget, setQuickTarget] = useState<TargetCategory>('Siswa');
  const [quickName, setQuickName] = useState('');
  const [quickLocation, setQuickLocation] = useState('Ruang Piket / Tata Usaha');
  const [quickMessage, setQuickMessage] = useState('');
  const [isCallingTts, setIsCallingTts] = useState(false);
  const [confirmSkipOpen, setConfirmSkipOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);

  // Time & Countdown state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDayName = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[currentTime.getDay()];
  }, [currentTime]);

  const activeModeSchedules = useMemo(() => {
    return appData.schedules.filter(
      (s) => s.category === appData.settings.active_mode && s.active
    );
  }, [appData.schedules, appData.settings.active_mode]);

  const todaySchedules = useMemo(() => {
    return activeModeSchedules.filter((s) => s.days.includes(currentDayName));
  }, [activeModeSchedules, currentDayName]);

  // Determine current, past, and upcoming sessions
  const currentHm = useMemo(() => {
    return currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [currentTime]);

  const nextBell = useMemo(() => {
    const weekdayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    for (let offset = 0; offset <= 14; offset += 1) {
      const date = new Date(currentTime);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + offset);
      const dateKey = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
      if (appData.holidays.some((holiday) => holiday.date === dateKey && holiday.is_school_off)) continue;
      const dayName = weekdayNames[date.getDay()];
      const candidates = activeModeSchedules
        .filter((schedule) =>
          schedule.days.includes(dayName) && (offset > 0 || schedule.time > currentHm)
        )
        .sort((a, b) => a.time.localeCompare(b.time));
      const schedule = candidates.find((candidate) =>
        `${dateKey}|${candidate.time}|${candidate.id}` !== skipOccurrenceKey
      );
      if (schedule) return { ...schedule, date: dateKey };
    }
    return null;
  }, [activeModeSchedules, appData.holidays, currentTime, currentHm, skipOccurrenceKey]);

  // Compute countdown to next bell
  const countdownStr = useMemo(() => {
    if (!nextBell) return '--:--';
    const [h, m] = nextBell.time.split(':').map(Number);
    const target = new Date(currentTime);
    const [year, month, day] = nextBell.date.split('-').map(Number);
    target.setFullYear(year, month - 1, day);
    target.setHours(h, m, 0, 0);
    const diffMs = target.getTime() - currentTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    if (hrs > 0) {
      return `${hrs}j ${mins}m ${secs}d`;
    }
    return `${mins}m ${secs}d`;
  }, [nextBell, currentTime]);

  // Stats
  const finishedCount = todaySchedules.filter((s) => s.time < currentHm).length;
  const upcomingCount = todaySchedules.filter((s) => s.time > currentHm).length;
  const activeCount = todaySchedules.length - finishedCount - upcomingCount;

  // Handle Quick TTS
  const handleQuickBroadcast = () => {
    if (!quickName.trim()) {
      alert('Silakan masukkan nama siswa / guru / target terlebih dahulu.');
      return;
    }
    setIsCallingTts(true);
    onSendTts(quickTarget, quickName, quickLocation, quickMessage, () => {
      setIsCallingTts(false);
      setQuickName('');
      setQuickMessage('');
    });
  };

  const recentSenamTrack = appData.playlist[0] || null;
  const recentBellHistory = (appData.bell_history ?? []).slice(0, 5);
  const receiverStatusText: Record<RemoteReceiverStatus, string> = {
    disabled: 'Penerima remote nonaktif',
    connecting: 'Penerima remote menghubungkan',
    connected: 'Penerima remote siap',
    error: 'Penerima remote bermasalah',
  };
  const emergencyAudioAvailable = !appData.settings.emergency_audio_file ||
    appData.playlist.some((track) => track.file_path === appData.settings.emergency_audio_file);
  const skipAlreadyPending = useMemo(() => {
    if (!skipOccurrenceKey) return false;
    const [datePart, timePart] = skipOccurrenceKey.split('|');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const target = new Date(year, month - 1, day, hour, minute);
    return target.getTime() > currentTime.getTime();
  }, [skipOccurrenceKey, currentTime]);

  const handleConfirmSkip = async () => {
    if (!nextBell) return;
    setIsSkipping(true);
    setSkipError(null);
    try {
      await onSkipNextBell({ id: nextBell.id, date: nextBell.date, time: nextBell.time });
      setConfirmSkipOpen(false);
    } catch (error) {
      setSkipError(String(error));
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-lg pb-24">
      {/* Top Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-r from-primary-container to-primary text-on-primary p-space-lg rounded-2xl shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold uppercase tracking-wider">
              Pusat Kendali Operasional
            </span>
            <span className="text-on-primary-container text-xs font-semibold">
              • Mode Aktif: {appData.settings.active_mode.toUpperCase()}
            </span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl tracking-tight text-white">
            Selamat Datang di AuraBell.OS
          </h1>
          <p className="text-on-primary-container text-sm">
            Sistem otomatisasi bel dan siaran pengumuman sekolah cerdas bebas jeda iklan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onTestBellAudio}
            disabled={!canPlayBell || isBellPlaybackActive}
            title={!canPlayBell ? 'Bunyi bel browser dinonaktifkan di navbar.' : undefined}
            className="flex items-center gap-2 bg-white text-primary hover:bg-primary-fixed px-4 py-2.5 rounded-xl font-headline font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bell className="w-4 h-4 text-primary" />
            <span>Tes Output Audio</span>
          </button>
          <button
            onClick={onPreviewEmergencyAudio}
            disabled={!canPlayBell || isBellPlaybackActive}
            title="Pratinjau sirene darurat selama 5 detik"
            className="flex items-center gap-2 border border-white/50 bg-black/10 text-white hover:bg-black/20 px-4 py-2.5 rounded-xl font-headline font-bold text-xs transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Pratinjau Sirene (5 dtk)</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Jadwal Hari Ini */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface-variant">
                Total Sesi {currentDayName}
              </span>
              <span className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mt-1">
                {todaySchedules.length}{' '}
                <span className="text-sm font-normal text-on-surface-variant">Sesi</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between font-semibold">
            <span className="text-[12px] text-primary flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              {finishedCount} Selesai
            </span>
            <span className="text-[12px] text-tertiary-container flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {activeCount > 0 ? activeCount : 0} Aktif
            </span>
            <span className="text-[12px] text-on-surface-variant flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
              {upcomingCount} Menunggu
            </span>
          </div>
        </div>

        {/* Stat 2: Bel Berikutnya (Next Bell with Countdown) */}
        <div className="bg-primary text-on-primary rounded-2xl p-space-md shadow-md flex flex-col justify-between relative overflow-hidden ring-2 ring-primary-container">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-fixed animate-ping"></span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-primary-container">
                  Bel Berikutnya (Otomatis)
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono font-bold text-3xl text-on-primary tracking-tight">
                  {nextBell ? nextBell.time : '--:--'}
                </span>
                <span className="text-xs font-bold text-on-primary-container">WIB</span>
              </div>
              <span className="text-xs font-medium text-white truncate max-w-[180px]">
                {nextBell ? nextBell.title : 'Tidak ada jadwal tersisa'}
              </span>
              {nextBell && nextBell.date !== [
                currentTime.getFullYear(),
                String(currentTime.getMonth() + 1).padStart(2, '0'),
                String(currentTime.getDate()).padStart(2, '0'),
              ].join('-') && (
                <span className="text-[11px] text-on-primary-container">
                  {new Date(`${nextBell.date}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-fixed">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 bg-black/20 rounded-xl px-3 py-1.5">
            <span className="text-xs text-on-primary-container flex items-center gap-1 whitespace-nowrap shrink-0">
              <Clock className="w-3.5 h-3.5" /> Hitung Mundur:
            </span>
            <span className="font-mono font-bold text-[13px] text-white whitespace-nowrap shrink-0">
              {countdownStr}
            </span>
          </div>
          {isTauri() && appData.settings.auto_bell_enabled && nextBell && (
            <button
              type="button"
              onClick={() => {
                setSkipError(null);
                setConfirmSkipOpen(true);
              }}
              disabled={skipAlreadyPending}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SkipForward className="h-4 w-4" />
              {skipAlreadyPending ? 'Satu jadwal sudah dikonfirmasi untuk dilewati' : 'Lewati bel berikutnya'}
            </button>
          )}
        </div>

        {/* Stat 3: Local audio output */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface-variant">
                Output Audio
              </span>
              <span className="font-headline font-extrabold text-xl text-on-surface tracking-tight mt-1">
                Perangkat Sistem
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary">
              <Volume2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-2 border-t border-surface-container pt-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-on-surface-variant">Volume master</span>
              <span className={`font-bold ${appData.settings.master_volume === 0 ? 'text-error' : 'text-primary'}`}>
                {appData.settings.master_volume}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isTauri() ? (
                appData.settings.auto_bell_enabled ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <CircleAlert className="h-4 w-4 text-error" />
                )
              ) : (
                <CircleAlert className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-on-surface-variant">
                {isTauri()
                  ? appData.settings.auto_bell_enabled ? 'Scheduler desktop aktif' : 'Bel otomatis nonaktif'
                  : 'Scheduler hanya berjalan di aplikasi desktop'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                remoteReceiverStatus === 'connected' ? 'bg-primary' :
                  remoteReceiverStatus === 'error' ? 'bg-error' : 'bg-outline-variant'
              }`} />
              <span className="text-on-surface-variant">
                {remoteReceiverEnabled ? receiverStatusText[remoteReceiverStatus] : 'Penerima remote nonaktif'}
              </span>
            </div>
            {appData.settings.master_volume === 0 && (
              <p className="flex items-center gap-1.5 text-error">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                Volume nol — tes audio tidak akan terdengar.
              </p>
            )}
            {!emergencyAudioAvailable && (
              <p className="flex items-center gap-1.5 text-error">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                File sirene pilihan tidak ada di pustaka.
              </p>
            )}
          </div>
        </div>

        {/* Stat 4: Audio Senam Terakhir */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface-variant">
                Audio Senam Terakhir
              </span>
              <span className="font-headline font-bold text-lg text-on-surface tracking-tight mt-1 truncate max-w-[170px]">
                {recentSenamTrack ? recentSenamTrack.title : 'Belum Diputar'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-tertiary">
              <Dumbbell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">
              Durasi: {recentSenamTrack ? recentSenamTrack.duration : '--:--'}
            </span>
            <button
              onClick={() => recentSenamTrack && onSelectTrack(recentSenamTrack)}
              className="font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Putar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="mb-3 flex items-center gap-2 border-b border-surface-container pb-3">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-headline text-base font-bold text-primary">Aktivitas Bel Terakhir</h2>
            <p className="text-xs text-on-surface-variant">Riwayat lokal di perangkat ini; maksimal 30 aktivitas.</p>
          </div>
        </div>
        {recentBellHistory.length === 0 ? (
          <p className="py-2 text-sm text-on-surface-variant">Bel belum berbunyi pada sesi yang tercatat.</p>
        ) : (
          <ul className="divide-y divide-surface-container">
            {recentBellHistory.map((record: BellHistoryRecord) => (
              <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">{record.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(record.timestamp).toLocaleString('id-ID')} · {
                      record.source === 'scheduled' ? 'Jadwal' :
                        record.source === 'emergency' ? 'Darurat' :
                          record.source === 'test' ? 'Tes audio' : 'Manual'
                    }
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  record.status === 'failed' ? 'bg-error-container text-on-error-container' :
                    record.status === 'playing' ? 'bg-amber-100 text-amber-800' :
                      'bg-surface-container text-on-surface-variant'
                }`}>
                  {record.status === 'playing' ? 'Berlangsung' :
                    record.status === 'completed' ? 'Selesai' :
                      record.status === 'failed' ? 'Gagal' : 'Dihentikan'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* QUICK ACCESS SPLIT GRID: Instant Senam Player vs Instant TTS Announcement */}
      <div className="grid grid-cols-1 gap-space-lg">
        {/* Left: Quick Senam Player Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-primary-fixed" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-base text-primary">
                    Pemutar Audio Senam Cepat
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Siap putar ke seluruh speaker lapangan tanpa jeda iklan
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                Bebas Iklan
              </span>
            </div>

            {/* Currently Selected Track Info */}
            <div className="mt-4 bg-surface-container-low/70 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Radio className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-headline font-bold text-sm text-on-surface">
                    {currentTrack ? currentTrack.title : (recentSenamTrack?.title || 'SKJ 2022 Pelajar Lengkap')}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Durasi: {currentTrack ? currentTrack.duration : (recentSenamTrack?.duration || '12:45')} • Kategori: Senam Pagi
                  </span>
                </div>
              </div>

              <button
                onClick={onTogglePlayMusic}
                disabled={!currentTrack}
                aria-label={isPlayingMusic ? 'Jeda audio' : 'Putar audio'}
                className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlayingMusic ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
            </div>

            {/* Quick Track Selection Dropdown */}
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant">
                Pilih Playlist Lagu Senam:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {appData.playlist.slice(0, 4).map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => onSelectTrack(tr)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      currentTrack?.id === tr.id
                        ? 'bg-primary-fixed/40 border-primary text-primary'
                        : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="truncate pr-2">{tr.title}</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      {tr.duration}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
            <span>Zona Output: Lapangan Sekolah & Selasar Utama</span>
            <span className="font-bold text-primary font-mono">Volume: {appData.settings.master_volume}%</span>
          </div>
        </div>

        {/* Right: Quick TTS Announcement Card */}
        {!isTauri() && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-primary-fixed" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-base text-primary">
                    Panggilan Suara Cepat (TTS)
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Kirim panggilan otomatis bergaya nada antrian bank/hospital
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed">
                {isTauri()
                  ? ttsEngine === 'system' ? 'Suara sistem id-ID' : 'Piper offline id-ID'
                  : 'Suara Natural id-ID'}
              </span>
            </div>

            {/* Target Category Pills */}
            <div className="mt-3 flex items-center gap-2">
              {(['Siswa', 'Guru', 'Umum'] as TargetCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setQuickTarget(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    quickTarget === cat
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  [{cat}]
                </button>
              ))}
            </div>

            {/* Form Inputs */}
            <div className="mt-3 flex flex-col gap-2.5">
              {isTauri() ? (
                ttsEngine === 'system' ? (
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant" htmlFor="quick-tts-voice">
                      Suara panggilan
                    </label>
                    <select
                      id="quick-tts-voice"
                      value={voiceGender}
                      onChange={(event) => onVoiceGenderChange(event.target.value as VoiceGender)}
                      className="w-full mt-1 px-3 py-2 bg-surface-container-low rounded-xl text-sm font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="female">Wanita</option>
                      <option value="male">Pria</option>
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant">
                    Piper Offline menggunakan satu voice Bahasa Indonesia.
                  </p>
                )
              ) : (
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant" htmlFor="quick-tts-voice">
                    Suara panggilan
                  </label>
                  <select
                    id="quick-tts-voice"
                    value={voiceGender}
                    onChange={(event) => onVoiceGenderChange(event.target.value as VoiceGender)}
                    className="w-full mt-1 px-3 py-2 bg-surface-container-low rounded-xl text-sm font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="female">Wanita</option>
                    <option value="male">Pria</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant">
                  Nama Penerima / Target:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Farhan Alamsyah (XII MIPA 1)"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low rounded-xl text-xs font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Tujuan / Ruangan:
                  </label>
                  <select
                    value={quickLocation}
                    onChange={(e) => setQuickLocation(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-surface-container-low rounded-xl text-xs font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Ruang Piket / Tata Usaha">Ruang Piket / TU</option>
                    <option value="Ruang BP / BK">Ruang BP / BK</option>
                    <option value="Ruang Kepala Sekolah">Ruang Kepala Sekolah</option>
                    <option value="Area Parkir Gerbang">Area Parkir Depan</option>
                    <option value="Perpustakaan">Perpustakaan</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Keperluan / Keterangan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ditunggu orang tua"
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-surface-container-low rounded-xl text-xs font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">
              Terdahulu: Ding-dong 2 nada + Pesan suara
            </span>
            <button
              onClick={handleQuickBroadcast}
              disabled={isCallingTts}
              className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-xl font-headline font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isCallingTts ? 'Menyiarkan...' : '📢 Siarkan Sekarang'}</span>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Today's Schedule Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <div>
            <h2 className="font-headline font-bold text-base text-primary">
              Urutan Jadwal Bel Hari Ini ({currentDayName})
            </h2>
            <p className="text-xs text-on-surface-variant">
              Mode saat ini: <strong className="capitalize">{appData.settings.active_mode}</strong> • Total {todaySchedules.length} Sesi Terjadwal
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-container text-on-surface-variant font-headline font-semibold">
                <th className="py-2.5 px-3">Jam (WIB)</th>
                <th className="py-2.5 px-3">Keterangan / Sesi</th>
                <th className="py-2.5 px-3">File Audio / Nada</th>
                <th className="py-2.5 px-3">Status Sesi</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {todaySchedules.map((item) => {
                const isPassed = item.time < currentHm;
                const todayKey = [
                  currentTime.getFullYear(),
                  String(currentTime.getMonth() + 1).padStart(2, '0'),
                  String(currentTime.getDate()).padStart(2, '0'),
                ].join('-');
                const isNext = nextBell?.date === todayKey && nextBell.id === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      isNext ? 'bg-primary-fixed/20 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-sm text-primary">
                      {item.time}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{item.title}</span>
                        {item.tts_text && (
                          <span className="text-[11px] text-on-surface-variant italic truncate max-w-sm">
                            "{item.tts_text}"
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      <span className="bg-surface-container px-2.5 py-1 rounded-md text-[11px] font-mono">
                        {item.audio_file}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {isNext ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-on-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          Berikutnya ({countdownStr})
                        </span>
                      ) : isPassed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container text-on-surface-variant">
                          <CheckCircle className="w-3 h-3 text-primary" /> Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-low text-on-surface-variant">
                          <Clock className="w-3 h-3" /> Menunggu
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onTriggerBell(item.title, item.audio_file, item.category)}
                        disabled={!canPlayBell}
                        title="Bunyikan bel sesi ini secara manual"
                        className="px-3 py-1 rounded-lg bg-surface-container hover:bg-primary hover:text-white transition-all text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Bunyikan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {confirmSkipOpen && nextBell && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-bell-title"
            className="w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-800">
                  <SkipForward className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="skip-bell-title" className="font-headline text-lg font-bold text-on-surface">
                    Lewati bel berikutnya?
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    <strong>{nextBell.title}</strong> · {nextBell.date} pukul {nextBell.time}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup konfirmasi"
                onClick={() => setConfirmSkipOpen(false)}
                className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
              Hanya kejadian jadwal ini yang dilewati sekali. Jadwal rutin tidak diubah dan tidak ada catatan yang disimpan.
            </p>
            {skipError && (
              <p role="alert" className="mt-3 rounded-xl bg-error-container p-3 text-sm text-on-error-container">
                Gagal melewati jadwal: {skipError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSkipOpen(false)}
                disabled={isSkipping}
                className="rounded-xl border border-outline-variant/40 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSkip()}
                disabled={isSkipping}
                className="inline-flex items-center gap-2 rounded-xl bg-error px-4 py-2 text-sm font-bold text-on-error hover:bg-red-700 disabled:opacity-50"
              >
                <SkipForward className="h-4 w-4" />
                {isSkipping ? 'Memproses...' : 'Ya, lewati sekali'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
