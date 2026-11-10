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
  Dumbbell
} from 'lucide-react';
import { AppData, ScheduleItem, AudioTrack, TargetCategory } from '../types';
import { audioEngine, TtsEngine, VoiceGender } from '../services/audioEngine';
import { isTauri } from '../services/tauriBridge';

interface DashboardViewProps {
  appData: AppData;
  canPlayBell: boolean;
  onTriggerBell: (title: string, audioFile: string, category?: string) => void;
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
  onTriggerBell,
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
    if (todaySchedules.length === 0) return null;
    const sorted = [...todaySchedules].sort((a, b) => a.time.localeCompare(b.time));
    const upcoming = sorted.find((s) => s.time > currentHm);
    return upcoming || sorted[0]; // If past last bell, wrap to first bell tomorrow
  }, [todaySchedules, currentHm]);

  // Compute countdown to next bell
  const countdownStr = useMemo(() => {
    if (!nextBell) return '--:--';
    const [h, m] = nextBell.time.split(':').map(Number);
    const target = new Date(currentTime);
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= currentTime.getTime()) {
      target.setDate(target.getDate() + 1);
    }
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

        {/* Quick bell test trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTriggerBell('Uji Coba Nada Westminster', 'westminster_chime.mp3')}
            disabled={!canPlayBell}
            title={!canPlayBell ? 'Bunyi bel browser dinonaktifkan di navbar.' : undefined}
            className="flex items-center gap-2 bg-white text-primary hover:bg-primary-fixed px-4 py-2.5 rounded-xl font-headline font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bell className="w-4 h-4 text-primary" />
            <span>Tes Nada Bel (Westminster)</span>
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
          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Volume master</span>
            <span className="font-bold text-primary">{appData.settings.master_volume}%</span>
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

      {/* QUICK ACCESS SPLIT GRID: Instant Senam Player vs Instant TTS Announcement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
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
                const isNext = nextBell?.id === item.id;
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
    </div>
  );
};
