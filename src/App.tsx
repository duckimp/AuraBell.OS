import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomPlayerBar } from './components/BottomPlayerBar';
import { ModalActiveBell } from './components/ModalActiveBell';
import { ModalAddSchedule } from './components/ModalAddSchedule';
import {
  AppData,
  AudioTrack,
  BellTriggerPayload,
  HolidayEvent,
  ScheduleCategory,
  ScheduleItem,
  TargetCategory,
  TtsCallRecord,
} from './types';
import { tauriBridge } from './services/tauriBridge';
import { audioEngine, VoiceGender } from './services/audioEngine';

const DashboardView = lazy(() =>
  import('./components/DashboardView').then(({ DashboardView }) => ({ default: DashboardView }))
);
const ScheduleView = lazy(() =>
  import('./components/ScheduleView').then(({ ScheduleView }) => ({ default: ScheduleView }))
);
const TtsView = lazy(() =>
  import('./components/TtsView').then(({ TtsView }) => ({ default: TtsView }))
);
const AudioPlayerView = lazy(() =>
  import('./components/AudioPlayerView').then(({ AudioPlayerView }) => ({ default: AudioPlayerView }))
);
const SpecialScheduleView = lazy(() =>
  import('./components/SpecialScheduleView').then(({ SpecialScheduleView }) => ({ default: SpecialScheduleView }))
);
const SettingsView = lazy(() =>
  import('./components/SettingsView').then(({ SettingsView }) => ({ default: SettingsView }))
);

export function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Active Bell Modal state
  const [activeBell, setActiveBell] = useState<BellTriggerPayload | null>(null);

  // Add / Edit Schedule Modal state
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ScheduleItem | null>(null);

  // Media Player state
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [masterVolume, setMasterVolume] = useState(85);
  const volumeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appDataRef = useRef(appData);
  appDataRef.current = appData;
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [ttsVoiceGender, setTtsVoiceGender] = useState<VoiceGender>(() =>
    typeof window !== 'undefined' && localStorage.getItem('aurabell_tts_voice') === 'male'
      ? 'male'
      : 'female'
  );
  const handleVoiceGenderChange = useCallback((gender: VoiceGender) => {
    setTtsVoiceGender(gender);
    localStorage.setItem('aurabell_tts_voice', gender);
  }, []);

  // Load initial data
  useEffect(() => {
    tauriBridge.fetchAppData().then((data) => {
      setAppData(data);
      setMasterVolume(data.settings.master_volume);
      audioEngine.setVolume(data.settings.master_volume);
      if (data.playlist.length > 0) {
        setCurrentTrack(data.playlist[0]);
      }
    });
    tauriBridge.getAutostartEnabled().then(setAutoStartEnabled).catch((error: unknown) => {
      console.error('Gagal membaca pengaturan mulai otomatis:', error);
    });
  }, []);

  // Set up bell trigger listeners
  useEffect(() => {
    const unlistenTrigger = tauriBridge.onBellTrigger((payload) => {
      setActiveBell(payload);
      audioEngine.stopBellAudio();
      audioEngine.stopSpeaking();
      audioEngine.stopEmergencySiren();
      const ttsText = payload.tts_text;
      if (payload.is_emergency) {
        audioEngine.startEmergencySiren();
      } else if (payload.audio_type === 'tts' && !payload.audio_file && ttsText) {
        audioEngine.speakIndonesian(ttsText, {
          gender: ttsVoiceGender,
          chime: 'none',
        });
      } else {
        audioEngine.playSoundFile(payload.audio_file, ttsText
          ? () => audioEngine.speakIndonesian(ttsText, {
              gender: ttsVoiceGender,
              chime: 'none',
            })
          : undefined);
      }
    });

    const unlistenStopped = tauriBridge.onBellStopped(() => {
      setActiveBell(null);
      audioEngine.stopEmergencySiren();
      audioEngine.stopBellAudio();
      audioEngine.stopSpeaking();
    });

    return () => {
      unlistenTrigger();
      unlistenStopped();
    };
  }, [ttsVoiceGender]);

  // Bell actions
  const handleTriggerBell = useCallback(
    (title: string, audioFile: string, category = 'reguler', isEmergency = false) => {
      void tauriBridge.triggerBell(title, audioFile, category, isEmergency).catch((error: unknown) => {
        console.error('Gagal membunyikan bel:', error);
      });
    },
    []
  );

  const handleStopBell = useCallback(() => {
    setActiveBell(null);
    audioEngine.stopEmergencySiren();
    audioEngine.stopBellAudio();
    audioEngine.stopSpeaking();
    tauriBridge.stopBell();
  }, []);

  // Emergency Bell
  const handleEmergencyTrigger = useCallback(() => {
    handleTriggerBell(
      'PERINGATAN DARURAT: SIRINE SEKOLAH BERBUNYI',
      'emergency_siren.mp3',
      'darurat',
      true
    );
  }, [handleTriggerBell]);

  // Master Volume handler
  const handleVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setVolume(vol);
    if (appData) {
      const updated = {
        ...appData,
        settings: { ...appData.settings, master_volume: vol },
      };
      setAppData(updated);
      if (volumeSaveTimer.current) clearTimeout(volumeSaveTimer.current);
      volumeSaveTimer.current = setTimeout(() => {
        const latest = appDataRef.current;
        if (latest) {
          void tauriBridge.saveAppData({
            ...latest,
            settings: { ...latest.settings, master_volume: vol },
          });
        }
      }, 500);
    }
  };

  useEffect(() => () => {
    if (volumeSaveTimer.current) {
      clearTimeout(volumeSaveTimer.current);
      const latest = appDataRef.current;
      if (latest) void tauriBridge.saveAppData(latest);
    }
  }, []);

  // Auto Bell toggle
  const handleToggleAutoBell = () => {
    if (!appData) return;
    const newVal = !appData.settings.auto_bell_enabled;
    const updated = {
      ...appData,
      settings: { ...appData.settings, auto_bell_enabled: newVal },
    };
    setAppData(updated);
    tauriBridge.toggleAutoBell(newVal);
  };

  const handleToggleAutoStart = async () => {
    const enabled = !autoStartEnabled;
    try {
      await tauriBridge.setAutostartEnabled(enabled);
      setAutoStartEnabled(enabled);
    } catch (error) {
      console.error('Gagal mengubah pengaturan mulai otomatis:', error);
      alert(`Pengaturan mulai otomatis gagal diubah: ${String(error)}`);
    }
  };

  // Schedule management
  const handleUpdateSchedules = (schedules: ScheduleItem[]) => {
    if (!appData) return;
    const updated = { ...appData, schedules };
    setAppData(updated);
    tauriBridge.saveAppData(updated);
  };

  const handleSaveSchoolSettings = async (schoolName: string, academicYear: string) => {
    if (!appData) return;
    const updated = {
      ...appData,
      settings: { ...appData.settings, school_name: schoolName, academic_year: academicYear },
    };
    await tauriBridge.saveAppData(updated);
    setAppData(updated);
  };

  const handleRestoreBackup = async (data: AppData) => {
    if (volumeSaveTimer.current) {
      clearTimeout(volumeSaveTimer.current);
      volumeSaveTimer.current = null;
    }
    await tauriBridge.saveAppData(data);
    audioEngine.stopBellAudio();
    audioEngine.stopSpeaking();
    setAppData(data);
    setMasterVolume(data.settings.master_volume);
    audioEngine.setVolume(data.settings.master_volume);
    setCurrentTrack(data.playlist[0] || null);
    setIsPlayingMusic(false);
  };

  const handleSetActiveMode = (mode: ScheduleCategory) => {
    if (!appData) return;
    const updated = {
      ...appData,
      settings: { ...appData.settings, active_mode: mode },
    };
    setAppData(updated);
    tauriBridge.setActiveMode(mode);
  };

  const handleOpenAddModal = (item?: ScheduleItem) => {
    setItemToEdit(item || null);
    setAddScheduleOpen(true);
  };

  const handleSaveScheduleItem = (item: ScheduleItem) => {
    if (!appData) return;
    const exists = appData.schedules.some((s) => s.id === item.id);
    let newSchedules: ScheduleItem[];
    if (exists) {
      newSchedules = appData.schedules.map((s) => (s.id === item.id ? item : s));
    } else {
      newSchedules = [...appData.schedules, item];
    }
    handleUpdateSchedules(newSchedules);
  };

  // TTS Actions
  const handleSendTts = (
    targetType: TargetCategory,
    name: string,
    location: string,
    message: string
  ) => {
    let prefix = 'Perhatian kepada ';
    if (targetType === 'Siswa') prefix += `siswa bernama ${name}, `;
    else if (targetType === 'Guru') prefix += `Bapak atau Ibu Guru ${name}, `;
    else if (targetType === 'Karyawan') prefix += `staf karyawan ${name}, `;
    else prefix += `seluruh warga sekolah dan tamu undangan, `;

    const dest = `dimohon untuk segera menuju ke ${location}. `;
    const extra = message ? `${message}. ` : '';
    const fullText = `${prefix}${dest}${extra}Terima kasih.`;

    audioEngine.speakIndonesian(fullText, {
      pitch: 1.0,
      rate: 0.95,
      volume: 1.0,
      gender: ttsVoiceGender,
      chime: 'bank',
    });

    const nowStr =
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';

    const record: TtsCallRecord = {
      id: `tts-${Date.now()}`,
      timestamp: nowStr,
      target_type: targetType,
      target_name: name || 'Panggilan Umum',
      location,
      message: message || 'Panggilan langsung dari petugas piket',
      chime_preset: 'Chime Bank 2 Nada',
      full_text: fullText,
    };

    if (appData) {
      const updatedHistory = [record, ...appData.tts_history];
      const updated = { ...appData, tts_history: updatedHistory };
      setAppData(updated);
      tauriBridge.addTtsRecord(record);
    }
  };

  const handleAddTtsRecord = (record: TtsCallRecord) => {
    if (!appData) return;
    const updatedHistory = [record, ...appData.tts_history];
    const updated = { ...appData, tts_history: updatedHistory };
    setAppData(updated);
    tauriBridge.addTtsRecord(record);
  };

  const handleClearTtsHistory = () => {
    if (!appData) return;
    if (confirm('Bersihkan seluruh riwayat panggilan suara hari ini?')) {
      const updated = { ...appData, tts_history: [] };
      setAppData(updated);
      tauriBridge.saveAppData(updated);
    }
  };

  // Music Player Actions
  const handleSelectTrack = (track: AudioTrack) => {
    setCurrentTrack(track);
    setIsPlayingMusic(true);
  };

  const handleTogglePlayMusic = useCallback(() => {
    setIsPlayingMusic((playing) => !playing);
  }, []);

  const handlePlaybackChange = useCallback((playing: boolean) => {
    setIsPlayingMusic(playing);
  }, []);

  const handleDeleteTrack = (id: string) => {
    if (!appData) return;
    if (confirm('Hapus media ini dari playlist?')) {
      const deletedTrack = appData.playlist.find((track) => track.id === id);
      if (deletedTrack?.file_path.startsWith('blob:')) URL.revokeObjectURL(deletedTrack.file_path);
      const updatedPlaylist = appData.playlist.filter((t) => t.id !== id);
      const updated = { ...appData, playlist: updatedPlaylist };
      setAppData(updated);
      tauriBridge.saveAppData(updated);
      if (currentTrack?.id === id) {
        setCurrentTrack(updatedPlaylist[0] || null);
        setIsPlayingMusic(false);
      }
    }
  };

  const handleImportYouTube = async (url: string, category: string, title?: string) => {
    const newTrack = await tauriBridge.downloadYouTubeAudio(url, category, title);
    if (appData) {
      const updated = {
        ...appData,
        playlist: [newTrack, ...appData.playlist],
      };
      setAppData(updated);
    }
    setCurrentTrack(newTrack);
  };

  const handleImportLocal = async (file: File | string, category: string): Promise<AudioTrack> => {
    const fileName = typeof file === 'string' ? file.split(/[\\/]/).pop() || file : file.name;
    const newTrack = await tauriBridge.importLocalAudio(
      file,
      fileName.replace(/\.[^/.]+$/, ''),
      category
    );
    if (appData) {
      const updated = {
        ...appData,
        playlist: [newTrack, ...appData.playlist],
      };
      setAppData(updated);
    }
    setCurrentTrack(newTrack);
    return newTrack;
  };

  const handleImportScheduleAudio = async (file: File | string): Promise<AudioTrack> => {
    const fileName = typeof file === 'string' ? file.split(/[\\/]/).pop() || file : file.name;
    const track = await tauriBridge.importLocalAudio(
      file,
      fileName.replace(/\.[^/.]+$/, ''),
      'Nada Bel'
    );
    if (appData) {
      setAppData({ ...appData, playlist: [track, ...appData.playlist] });
    }
    return track;
  };

  const handleAddTrackToSchedule = (track: AudioTrack) => {
    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}`,
      time: '07:00',
      title: `Senam: ${track.title}`,
      category: appData?.settings.active_mode || 'reguler',
      days: ['Jumat'],
      audio_file: track.file_path,
      audio_type: 'custom',
      active: true,
    };
    handleSaveScheduleItem(newItem);
    alert(`Lagu "${track.title}" berhasil ditambahkan ke jadwal bel!`);
  };

  // Holidays
  const handleUpdateHolidays = (holidays: HolidayEvent[]) => {
    if (!appData) return;
    const updated = { ...appData, holidays };
    setAppData(updated);
    tauriBridge.saveAppData(updated);
  };

  if (!appData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-headline font-bold text-sm text-primary">
            Memuat AuraBell.OS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        masterVolume={masterVolume}
        activeMode={appData.settings.active_mode}
        schoolName={appData.settings.school_name}
        autoStartEnabled={autoStartEnabled}
        onToggleAutoStart={handleToggleAutoStart}
      />

      {/* Main Content Area */}
      <div className="pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          academicYear={appData.settings.academic_year}
          schoolName={appData.settings.school_name}
          autoBellEnabled={appData.settings.auto_bell_enabled}
          activeMode={appData.settings.active_mode}
          onToggleAutoBell={handleToggleAutoBell}
          onEmergencyTrigger={handleEmergencyTrigger}
        />

        {/* View Routed by Tab */}
        <main className="pt-20 px-gutter-desktop min-h-[calc(100vh-80px)]">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16 text-sm font-semibold text-primary">
                Memuat halaman...
              </div>
            }
          >
            {currentTab === 'dashboard' && (
              <DashboardView
                appData={appData}
                onTriggerBell={handleTriggerBell}
                onSendTts={handleSendTts}
                onSelectTrack={handleSelectTrack}
                voiceGender={ttsVoiceGender}
                onVoiceGenderChange={handleVoiceGenderChange}
                isPlayingMusic={isPlayingMusic}
                currentTrack={currentTrack}
                onTogglePlayMusic={handleTogglePlayMusic}
              />
            )}

            {currentTab === 'jadwal' && (
              <ScheduleView
                appData={appData}
                onUpdateSchedules={handleUpdateSchedules}
                onSetActiveMode={handleSetActiveMode}
                onOpenAddModal={handleOpenAddModal}
                onTriggerBell={handleTriggerBell}
              />
            )}

            {currentTab === 'tts' && (
              <TtsView
                appData={appData}
                onAddRecord={handleAddTtsRecord}
                onClearHistory={handleClearTtsHistory}
                voiceGender={ttsVoiceGender}
                onVoiceGenderChange={handleVoiceGenderChange}
              />
            )}

            {currentTab === 'senam' && (
              <AudioPlayerView
                appData={appData}
                onSelectTrack={handleSelectTrack}
                currentTrack={currentTrack}
                isPlayingMusic={isPlayingMusic}
                onTogglePlayMusic={handleTogglePlayMusic}
                onDeleteTrack={handleDeleteTrack}
                onImportYouTube={handleImportYouTube}
                onImportLocal={handleImportLocal}
                onAddToSchedule={handleAddTrackToSchedule}
              />
            )}

            {currentTab === 'khusus' && (
              <SpecialScheduleView
                appData={appData}
                onUpdateHolidays={handleUpdateHolidays}
                onSetActiveMode={handleSetActiveMode}
              />
            )}

            {currentTab === 'pengaturan' && (
              <SettingsView
                appData={appData}
                onSaveSchoolSettings={handleSaveSchoolSettings}
                onRestoreBackup={handleRestoreBackup}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Bottom Floating Music Player Bar */}
      <BottomPlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlayingMusic}
        onTogglePlay={handleTogglePlayMusic}
        onPlaybackChange={handlePlaybackChange}
        volume={masterVolume}
        onVolumeChange={handleVolumeChange}
      />

      {/* Real-time Bell Active Ringing Modal */}
      <ModalActiveBell
        payload={activeBell}
        onClose={() => setActiveBell(null)}
        onStopBell={handleStopBell}
      />

      {/* Modal Add / Edit Schedule */}
      <ModalAddSchedule
        isOpen={addScheduleOpen}
        onClose={() => setAddScheduleOpen(false)}
        onSave={handleSaveScheduleItem}
        onImportAudio={handleImportScheduleAudio}
        itemToEdit={itemToEdit}
        appData={appData}
      />
    </div>
  );
}

export default App;
