import React, { useState, useEffect } from 'react';
import {
  Mic2,
  Volume2,
  Send,
  RotateCcw,
  Sparkles,
  UserCheck,
  Building,
  Sliders,
  History,
  Trash2,
  Play,
  VolumeX,
  Radio
} from 'lucide-react';
import { AppData, TargetCategory, TtsCallRecord } from '../types';
import {
  audioEngine,
  findIndonesianVoice,
  getIndonesianVoices,
  TtsEngine,
  VoiceGender,
} from '../services/audioEngine';
import { isTauri } from '../services/tauriBridge';

interface TtsViewProps {
  appData: AppData;
  onAddRecord: (record: TtsCallRecord) => void;
  onClearHistory: () => void;
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  ttsEngine: TtsEngine;
  onTtsEngineChange: (engine: TtsEngine) => void;
}

export const TtsView: React.FC<TtsViewProps> = ({
  appData,
  onAddRecord,
  onClearHistory,
  voiceGender,
  onVoiceGenderChange,
  ttsEngine,
  onTtsEngineChange,
}) => {
  const [targetType, setTargetType] = useState<TargetCategory>('Siswa');
  const [targetName, setTargetName] = useState('');
  const [targetLocation, setTargetLocation] = useState('Ruang Piket / Tata Usaha');
  const [message, setMessage] = useState('');
  const [chimePreset, setChimePreset] = useState<'bank' | 'airport' | 'dingdong' | 'none'>('bank');

  // Speech settings
  const [rate, setRate] = useState(0.95);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Status
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [synthesizedPreview, setSynthesizedPreview] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const isOfflineDesktop = isTauri();

  useEffect(() => {
    const updateVoices = () => setAvailableVoices(getIndonesianVoices());
    updateVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', updateVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', updateVoices);
  }, []);

  const selectedVoice = findIndonesianVoice(voiceGender);

  // Update synthesized preview text dynamically
  useEffect(() => {
    let prefix = 'Perhatian kepada ';
    if (targetType === 'Siswa') {
      prefix += `siswa yang bernama ${targetName || '[Nama Siswa]'}, `;
    } else if (targetType === 'Guru') {
      prefix += `Bapak atau Ibu Guru ${targetName || '[Nama Guru]'}, `;
    } else if (targetType === 'Karyawan') {
      prefix += `staf karyawan ${targetName || '[Nama Karyawan]'}, `;
    } else {
      prefix += `seluruh warga sekolah dan tamu undangan, `;
    }

    const dest = `dimohon untuk segera menuju ke ${targetLocation}. `;
    const extra = message ? `${message}. ` : '';
    const closing = 'Terima kasih atas perhatiannya.';

    setSynthesizedPreview(`${prefix}${dest}${extra}${closing}`);
  }, [targetType, targetName, targetLocation, message]);

  // Presets
  const applyPreset = (template: {
    category: TargetCategory;
    name: string;
    location: string;
    msg: string;
  }) => {
    setTargetType(template.category);
    setTargetName(template.name);
    setTargetLocation(template.location);
    setMessage(template.msg);
  };

  // Broadcast / Play
  const handlePlayAnnouncement = (isTest = false) => {
    if (!targetName.trim() && targetType !== 'Umum') {
      alert('Silakan masukkan nama penerima terlebih dahulu.');
      return;
    }

    setIsBroadcasting(true);

    audioEngine.speakIndonesian(synthesizedPreview, {
      pitch,
      rate,
      volume,
      gender: voiceGender,
      engine: ttsEngine,
      chime: chimePreset,
      onStart: () => setIsBroadcasting(true),
      onEnd: () => {
        setIsBroadcasting(false);
        if (!isTest) {
          const nowStr = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }) + ' WIB';

          const record: TtsCallRecord = {
            id: `tts-${Date.now()}`,
            timestamp: nowStr,
            target_type: targetType,
            target_name: targetName || 'Pengumuman Umum Sekolah',
            location: targetLocation,
            message: message || 'Panggilan langsung dari petugas piket',
            chime_preset:
              chimePreset === 'bank'
                ? 'Chime Bank 2 Nada'
                : chimePreset === 'airport'
                ? 'Chime Bandara'
                : chimePreset === 'dingdong'
                ? 'Ding-Dong 3 Nada'
                : 'Tanpa Nada',
            full_text: synthesizedPreview,
          };
          onAddRecord(record);
        }
      },
      onError: (error) => {
        setIsBroadcasting(false);
        alert(`Gagal memutar TTS: ${error}`);
      },
    });
  };

  const handleStopAnnouncement = () => {
    audioEngine.stopSpeaking();
    audioEngine.stopBellAudio();
    setIsBroadcasting(false);
  };

  // Replay from history
  const handleReplayHistory = (item: TtsCallRecord) => {
    setIsBroadcasting(true);
    audioEngine.speakIndonesian(item.full_text, {
      pitch: 1.0,
      rate: 0.95,
      volume: 1.0,
      gender: voiceGender,
      engine: ttsEngine,
      chime: 'bank',
      onStart: () => setIsBroadcasting(true),
      onEnd: () => setIsBroadcasting(false),
      onError: (error) => {
        setIsBroadcasting(false);
        alert(`Gagal memutar TTS: ${error}`);
      },
    });
  };

  return (
    <div className="flex flex-col gap-space-lg pb-24">
      {/* Header Context */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold uppercase tracking-wider">
              Modul Suara Digital
            </span>
            <span className="text-on-surface-variant text-xs">
              {isOfflineDesktop
                ? '• Piper TTS Offline id-ID + Nada Antrian Bank'
                : '• Text-to-Speech Web API id-ID + Nada Antrian Bank'}
            </span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight">
            Panggilan Suara Otomatis & Text-to-Speech (TTS)
          </h1>
          <p className="text-on-surface-variant text-sm">
            Kirim panggilan instan untuk siswa, guru, atau pengumuman darurat sekolah ke seluruh speaker PA.
          </p>
        </div>

        {/* Live Audio Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs font-semibold text-primary">
            <span className={`w-2.5 h-2.5 rounded-full ${isBroadcasting ? 'bg-error animate-ping' : 'bg-primary'}`}></span>
            <span>{isBroadcasting ? 'SEDANG MENGUDARA (ON AIR)' : 'Standby / Siap Mengudara'}</span>
          </div>
          {isBroadcasting && (
            <button
              onClick={handleStopAnnouncement}
              className="px-3 py-2 bg-error text-white text-xs font-bold rounded-xl hover:bg-red-700 cursor-pointer"
            >
              Hentikan
            </button>
          )}
        </div>
      </div>

      {/* Main TTS Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {/* Left: Input Form (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-base text-primary">
                Formulir Panggilan Instan
              </h2>
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">
              Ting-Tung + Suara AI
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Template Pesan Cepat:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  applyPreset({
                    category: 'Siswa',
                    name: 'Muhammad Rizky (Kelas XII MIPA 2)',
                    location: 'Ruang Piket / Tata Usaha',
                    msg: 'Ditunggu oleh orang tua membawa pakaian ganti',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Panggilan ke Ruang Piket
              </button>
              <button
                onClick={() =>
                  applyPreset({
                    category: 'Umum',
                    name: 'Pemilik Kendaraan Avanza Hitam B 1945 SUT',
                    location: 'Area Parkir Gerbang Depan',
                    msg: 'Dimohon memindahkan kendaraan karena menghalangi bus sekolah',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Mobil Menghalangi Gerbang
              </button>
              <button
                onClick={() =>
                  applyPreset({
                    category: 'Guru',
                    name: 'Bapak Drs. Bambang Sudarsono',
                    location: 'Ruang Kepala Sekolah',
                    msg: 'Ditunggu untuk rapat dinas mendesak',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Panggilan Rapat Guru
              </button>
              <button
                onClick={() =>
                  applyPreset({
                    category: 'Siswa',
                    name: 'Seluruh Pengurus OSIS',
                    location: 'Ruang OSIS',
                    msg: 'Diharapkan berkumpul untuk gladi bersih upacara',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Pengurus OSIS
              </button>
            </div>
          </div>

          {/* Target Category Selector */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1.5">
              1. Pilih Kategori Target:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Siswa', 'Guru', 'Karyawan', 'Umum'] as TargetCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTargetType(cat)}
                  className={`py-2 px-3 rounded-xl font-headline font-bold text-xs transition-all cursor-pointer text-center ${
                    targetType === cat
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  [{cat}]
                </button>
              ))}
            </div>
          </div>

          {/* Target Name & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                2. Nama Penerima / Target Panggilan:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Contoh: Ahmad Rizki (Kelas X-A)"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                3. Ruang Tujuan / Lokasi Pertemuan:
              </label>
              <select
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Ruang Piket / Tata Usaha">Ruang Piket / Tata Usaha</option>
                <option value="Ruang Bimbingan Konseling (BK)">Ruang Bimbingan Konseling (BK)</option>
                <option value="Ruang Kepala Sekolah">Ruang Kepala Sekolah</option>
                <option value="Perpustakaan Sekolah">Perpustakaan Sekolah</option>
                <option value="Laboratorium Komputer">Laboratorium Komputer</option>
                <option value="Ruang UKS">Ruang UKS</option>
                <option value="Area Parkir Gerbang Utama">Area Parkir Gerbang Utama</option>
                <option value="Lobi Utama Sekolah">Lobi Utama Sekolah</option>
              </select>
            </div>
          </div>

          {/* Nada Chime & Pesan Tambahan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                4. Pilihan Nada Chime Antrian:
              </label>
              <select
                value={chimePreset}
                onChange={(e) => setChimePreset(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="bank">Chime Bank 2 Nada (Sol - Do)</option>
                <option value="dingdong">Ding-Dong 3 Nada (Do - Mi - Sol)</option>
                <option value="airport">Chime Bandara (Mi - Do - Sol)</option>
                <option value="none">Tanpa Nada (Langsung Suara)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                5. Keterangan / Pesan Tambahan:
              </label>
              <input
                type="text"
                placeholder="Contoh: Membawa perlengkapan ujian"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="mt-2 p-3.5 bg-primary-fixed/20 border border-primary/20 rounded-xl flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Teks yang Akan Dibacakan Oleh Sistem:
            </span>
            <textarea
              aria-label="Teks pengumuman yang akan dibacakan"
              rows={4}
              value={synthesizedPreview}
              onChange={(event) => setSynthesizedPreview(event.target.value)}
              className="w-full resize-y text-sm text-on-surface font-medium leading-relaxed bg-white/70 p-2.5 rounded-lg border border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handlePlayAnnouncement(true)}
              disabled={isBroadcasting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-headline font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Volume2 className="w-4 h-4 text-primary" />
              <span>🔊 Uji Dengarkan (Lokal)</span>
            </button>
            <button
              onClick={() => handlePlayAnnouncement(false)}
              disabled={isBroadcasting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-headline font-bold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isBroadcasting ? 'Menyiarkan Suara...' : '📢 Putar & Panggil Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Right: Sound Modulation & Visualizer */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-secondary" />
                <h3 className="font-headline font-bold text-sm text-primary">
                  Kalibrasi Suara AI
                </h3>
              </div>
              <span className="text-[11px] text-on-surface-variant font-medium">
                {isOfflineDesktop
                  ? `Engine: ${ttsEngine === 'system' ? 'Suara Sistem' : 'Piper Offline'}`
                  : 'Engine: Web Speech'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {isOfflineDesktop && (
                <>
                  <label htmlFor="tts-engine" className="text-sm font-semibold text-on-surface-variant">
                    Mesin suara
                  </label>
                  <select
                    id="tts-engine"
                    value={ttsEngine}
                    onChange={(event) => onTtsEngineChange(event.target.value as TtsEngine)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-sm font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="system">Suara Sistem (lebih natural)</option>
                    <option value="piper">Piper Offline</option>
                  </select>
                  <p className="text-xs text-on-surface-variant">
                    {ttsEngine === 'system'
                      ? 'Memakai voice Bahasa Indonesia dari sistem. Jika tidak tersedia, otomatis beralih ke Piper Offline.'
                      : 'Berjalan sepenuhnya offline dengan satu voice bawaan.'}
                  </p>
                </>
              )}
              {(!isOfflineDesktop || ttsEngine === 'system') && (
                <>
                  <label htmlFor="tts-voice-gender" className="mt-2 text-sm font-semibold text-on-surface-variant">
                    Suara panggilan
                  </label>
                  <select
                    id="tts-voice-gender"
                    value={voiceGender}
                    onChange={(event) => onVoiceGenderChange(event.target.value as VoiceGender)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-sm font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="female">Wanita</option>
                    <option value="male">Pria</option>
                  </select>
                  <p className="text-xs text-on-surface-variant">
                    {selectedVoice
                      ? `Voice tersedia: ${selectedVoice.name}`
                      : availableVoices.length > 0
                        ? `Voice ${voiceGender === 'female' ? 'wanita' : 'pria'} khusus tidak terdeteksi; sistem akan memilih voice default.`
                        : 'Voice Bahasa Indonesia bergantung pada yang terpasang di sistem.'}
                  </p>
                </>
              )}
            </div>

            {/* Audio Wave Visualizer Simulation */}
            <div className="h-28 bg-surface-container-low rounded-xl flex items-center justify-center gap-1.5 px-4 overflow-hidden relative">
              {[40, 65, 30, 85, 95, 45, 75, 100, 60, 80, 50, 70, 90, 40, 60].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height: isBroadcasting ? `${Math.max(15, (h * Math.random()) + 20)}%` : '15%',
                    transition: 'height 0.15s ease-in-out',
                  }}
                  className={`w-2 rounded-full ${
                    isBroadcasting ? 'bg-primary' : 'bg-outline-variant/40'
                  }`}
                />
              ))}
              <div className="absolute bottom-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                {isBroadcasting ? 'Gelombang Suara Aktif' : 'Visualizer Standby'}
              </div>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-on-surface-variant">Kecepatan Bicara (Speed):</span>
                  <span className="font-mono font-bold text-primary">{rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {!isOfflineDesktop && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-on-surface-variant">Tinggi Nada (Pitch):</span>
                    <span className="font-mono font-bold text-primary">{pitch}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-on-surface-variant">Volume Panggilan:</span>
                  <span className="font-mono font-bold text-primary">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant mt-4">
            <span className="font-bold text-on-surface block">Pemberitahuan:</span>
            Panggilan instan otomatis memprioritaskan audio di atas pemutar lagu senam untuk kelancaran informasi darurat.
          </div>
        </div>
      </div>

      {/* Daily Call Log Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-base text-primary">
              Riwayat Panggilan Suara Hari Ini
            </h2>
          </div>
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface-variant transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Riwayat</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-container text-on-surface-variant font-headline font-semibold">
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Penerima / Target</th>
                <th className="py-2.5 px-3">Tujuan / Lokasi</th>
                <th className="py-2.5 px-3">Ringkasan Pesan</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {appData.tts_history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    Belum ada riwayat panggilan untuk hari ini.
                  </td>
                </tr>
              ) : (
                appData.tts_history.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-primary">
                      {item.timestamp}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-fixed text-on-primary-fixed">
                        {item.target_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-on-surface">
                      {item.target_name}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      {item.location}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant truncate max-w-xs">
                      {item.message}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleReplayHistory(item)}
                        className="flex items-center gap-1 ml-auto px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary hover:text-white transition-all text-xs font-semibold cursor-pointer"
                        title="Putar Ulang Pengumuman"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Putar Ulang</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
