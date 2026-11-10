import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomPlayerBar } from './components/BottomPlayerBar';
import { ModalActiveBell } from './components/ModalActiveBell';
import { ModalAddSchedule } from './components/ModalAddSchedule';
import {
  AppData,
  AudioTrack,
  BellHistoryRecord,
  BellTriggerPayload,
  HolidayEvent,
  ScheduleCategory,
  ScheduleItem,
  TargetCategory,
  TtsCallRecord,
} from './types';
import { isTauri, tauriBridge } from './services/tauriBridge';
import { audioEngine, TtsEngine, VoiceGender } from './services/audioEngine';
import { deleteBrowserAudio, getBrowserAudioId } from './services/browserAudioStore';
import { supabase } from './services/supabase';
import {
  claimRemoteAnnouncement,
  completeRemoteAnnouncement,
  REMOTE_RECEIVER_STORAGE_KEY,
  RemoteReceiverStatus,
  subscribeToRemoteAnnouncements,
} from './services/remoteAnnouncements';

interface AppProps {
  onSignOut: () => void;
}

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

const BROWSER_BELL_ENABLED_KEY = 'aurabell_browser_bell_enabled';

export function App({ onSignOut }: AppProps) {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Active Bell Modal state
  const [activeBell, setActiveBell] = useState<BellTriggerPayload | null>(null);
  const [isBellPlaybackActive, setIsBellPlaybackActive] = useState(false);
  const [skipOccurrenceKey, setSkipOccurrenceKey] = useState<string | null>(null);
  const activeHistoryIdRef = useRef<string | null>(null);
  const testHistoryIdRef = useRef<string | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const updateBellHistoryStatus = useCallback((id: string, status: BellHistoryRecord['status']) => {
    const current = appDataRef.current;
    if (!current) return;
    const updated = {
      ...current,
      bell_history: (current.bell_history ?? []).map((record) =>
        record.id === id ? { ...record, status } : record
      ),
    };
    appDataRef.current = updated;
    setAppData(updated);
    void tauriBridge.saveAppData(updated).catch((error: unknown) => {
      console.error('Gagal memperbarui riwayat bel:', error);
    });
    if (activeHistoryIdRef.current === id) activeHistoryIdRef.current = null;
    if (testHistoryIdRef.current === id) testHistoryIdRef.current = null;
  }, []);

  const addBellHistory = useCallback((
    title: string,
    time: string,
    source: BellHistoryRecord['source']
  ): string | null => {
    const current = appDataRef.current;
    if (!current) return null;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record: BellHistoryRecord = {
      id,
      timestamp: new Date().toISOString(),
      time,
      title,
      source,
      status: 'playing',
    };
    const updated = {
      ...current,
      bell_history: [record, ...(current.bell_history ?? [])].slice(0, 30),
    };
    appDataRef.current = updated;
    setAppData(updated);
    void tauriBridge.saveAppData(updated).catch((error: unknown) => {
      console.error('Gagal menyimpan riwayat bel:', error);
      alert(`Bel berbunyi, tetapi riwayat gagal disimpan: ${String(error)}`);
    });
    return id;
  }, []);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [remoteReceiverEnabled, setRemoteReceiverEnabled] = useState(false);
  const [remoteReceiverStatus, setRemoteReceiverStatus] = useState<RemoteReceiverStatus>('disabled');
  const [browserBellEnabled, setBrowserBellEnabled] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(BROWSER_BELL_ENABLED_KEY) === 'true'
  );
  const [ttsVoiceGender, setTtsVoiceGender] = useState<VoiceGender>(() =>
    typeof window !== 'undefined' && localStorage.getItem('aurabell_tts_voice') === 'male'
      ? 'male'
      : 'female'
  );
  const handleVoiceGenderChange = useCallback((gender: VoiceGender) => {
    setTtsVoiceGender(gender);
    localStorage.setItem('aurabell_tts_voice', gender);
  }, []);
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>(() =>
    typeof window !== 'undefined' && localStorage.getItem('aurabell_tts_engine') === 'system'
      ? 'system'
      : 'piper'
  );
  const handleTtsEngineChange = useCallback((engine: TtsEngine) => {
    setTtsEngine(engine);
    localStorage.setItem('aurabell_tts_engine', engine);
  }, []);

  // Load initial data
  useEffect(() => {
    tauriBridge.fetchAppData().then((data) => {
      const normalizedData = {
        ...data,
        bell_history: data.bell_history ?? [],
        settings: {
          ...data.settings,
          music_duck_percent: data.settings.music_duck_percent ?? 20,
          emergency_audio_file: data.settings.emergency_audio_file ?? '',
        },
      };
      setAppData(normalizedData);
      setMasterVolume(normalizedData.settings.master_volume);
      audioEngine.setVolume(normalizedData.settings.master_volume);
      if (normalizedData.playlist.length > 0) {
        setCurrentTrack(normalizedData.playlist[0]);
      }
    });
    tauriBridge.getAutostartEnabled().then(setAutoStartEnabled).catch((error: unknown) => {
      console.error('Gagal membaca pengaturan mulai otomatis:', error);
    });
  }, []);

  // Set up bell trigger listeners
  useEffect(() => {
    const unlistenTrigger = tauriBridge.onBellTrigger((payload) => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      if (testHistoryIdRef.current) {
        updateBellHistoryStatus(testHistoryIdRef.current, 'stopped');
      }
      if (activeHistoryIdRef.current) {
        updateBellHistoryStatus(activeHistoryIdRef.current, 'stopped');
      }
      setActiveBell(payload);
      setIsBellPlaybackActive(true);
      audioEngine.stopBellAudio();
      audioEngine.stopSpeaking();
      audioEngine.stopEmergencySiren();
      const source: BellHistoryRecord['source'] = payload.is_emergency
        ? 'emergency'
        : payload.schedule_id ? 'scheduled' : 'manual';
      const historyId = addBellHistory(payload.title, payload.time, source);
      activeHistoryIdRef.current = historyId;
      const finish = (status: BellHistoryRecord['status']) => {
        if (historyId) updateBellHistoryStatus(historyId, status);
        setIsBellPlaybackActive(false);
      };
      const ttsText = payload.tts_text;
      if (payload.is_emergency) {
        if (payload.audio_file) {
          audioEngine.startEmergencyAudio(payload.audio_file, (error) => {
            console.error('Audio darurat kustom gagal, memakai sirene bawaan:', error);
            audioEngine.startEmergencySiren();
            alert('Audio darurat kustom gagal diputar. Sirene bawaan AuraBell.OS akan digunakan.');
          });
        } else {
          audioEngine.startEmergencySiren();
        }
      } else if (payload.audio_type === 'tts' && !payload.audio_file && ttsText) {
        audioEngine.speakIndonesian(ttsText, {
          gender: ttsVoiceGender,
          engine: ttsEngine,
          chime: 'none',
          onEnd: () => finish('completed'),
          onError: (error) => {
            finish('failed');
            alert(`Gagal memutar TTS bel: ${error}`);
          },
        });
      } else {
        audioEngine.playSoundFile(payload.audio_file, ttsText
          ? () => audioEngine.speakIndonesian(ttsText, {
              gender: ttsVoiceGender,
              engine: ttsEngine,
              chime: 'none',
              onEnd: () => finish('completed'),
              onError: (error) => {
                finish('failed');
                alert(`Gagal memutar TTS bel: ${error}`);
              },
            })
          : () => finish('completed'),
          { onError: (error) => {
            finish('failed');
            alert(`Gagal memutar audio bel: ${error}`);
          } });
      }
    });

    const unlistenStopped = tauriBridge.onBellStopped(() => {
      setActiveBell(null);
      setIsBellPlaybackActive(false);
      if (activeHistoryIdRef.current) {
        updateBellHistoryStatus(activeHistoryIdRef.current, 'stopped');
      }
      if (testHistoryIdRef.current) {
        updateBellHistoryStatus(testHistoryIdRef.current, 'stopped');
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      audioEngine.stopEmergencySiren();
      audioEngine.stopBellAudio();
      audioEngine.stopSpeaking();
    });

    return () => {
      unlistenTrigger();
      unlistenStopped();
    };
  }, [addBellHistory, ttsEngine, ttsVoiceGender, updateBellHistoryStatus]);

  useEffect(() => {
    const updateReceiverSetting = () => {
      const enabled = localStorage.getItem(REMOTE_RECEIVER_STORAGE_KEY) === 'true';
      setRemoteReceiverEnabled(enabled);
      if (!enabled) setRemoteReceiverStatus('disabled');
    };
    updateReceiverSetting();
    window.addEventListener('storage', updateReceiverSetting);
    window.addEventListener('aurabell-remote-receiver-config-changed', updateReceiverSetting);
    return () => {
      window.removeEventListener('storage', updateReceiverSetting);
      window.removeEventListener('aurabell-remote-receiver-config-changed', updateReceiverSetting);
    };
  }, []);

  useEffect(() => {
    if (!remoteReceiverEnabled || !supabase) return;

    let active = true;
    setRemoteReceiverStatus('connecting');
    const unsubscribe = subscribeToRemoteAnnouncements(async (commandId) => {
      try {
        const command = await claimRemoteAnnouncement(commandId);
        if (!active || !command) return;

        const finish = (failure?: string) => {
          void completeRemoteAnnouncement(command.id, failure).catch((error: unknown) => {
            console.error('Gagal memperbarui status pengumuman remote:', error);
          });
        };
        audioEngine.speakIndonesian(command.announcement_text, {
          gender: ttsVoiceGender,
          rate: 0.95,
          volume: 1,
          chime: 'none',
          preferWebSpeech: true,
          onEnd: () => {
            finish();
            const timestamp = new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }) + ' WIB';
            void tauriBridge.addTtsRecord({
              id: `remote-${command.id}`,
              timestamp,
              target_type: 'Umum',
              target_name: 'Pengumuman Remote',
              location: 'Ruang TU',
              message: 'Dikirim dari akun sekolah',
              chime_preset: 'Tanpa Nada',
              full_text: command.announcement_text,
            });
          },
          onError: (message) => finish(message),
        });
      } catch (error) {
        console.error('Gagal menerima pengumuman remote:', error);
      }
    }, (message) => {
      console.error(message);
      if (active) setRemoteReceiverStatus('error');
    }, (status) => {
      if (active) setRemoteReceiverStatus(status);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [remoteReceiverEnabled, ttsVoiceGender]);

  // Bell actions
  const handleTriggerBell = useCallback(
    (title: string, audioFile: string, category = 'reguler', isEmergency = false) => {
      if (!isTauri() && !browserBellEnabled) return;
      void tauriBridge.triggerBell(title, audioFile, category, isEmergency).catch((error: unknown) => {
        console.error('Gagal membunyikan bel:', error);
      });
    },
    [browserBellEnabled]
  );

  const handleTestBellAudio = useCallback(() => {
    if ((!isTauri() && !browserBellEnabled) || isBellPlaybackActive) return;
    if (testHistoryIdRef.current) {
      updateBellHistoryStatus(testHistoryIdRef.current, 'stopped');
    }
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const historyId = addBellHistory('Tes output audio (Westminster)', time, 'test');
    testHistoryIdRef.current = historyId;
    setIsBellPlaybackActive(true);
    audioEngine.playSoundFile(
      'westminster_chime.mp3',
      () => {
        if (historyId) updateBellHistoryStatus(historyId, 'completed');
        setIsBellPlaybackActive(false);
      },
      {
        onError: (error) => {
          if (historyId) updateBellHistoryStatus(historyId, 'failed');
          setIsBellPlaybackActive(false);
          alert(`Tes audio gagal: ${error}`);
        },
      }
    );
  }, [addBellHistory, browserBellEnabled, isBellPlaybackActive, updateBellHistoryStatus]);

  const handlePreviewEmergencyAudio = useCallback(() => {
    if ((!isTauri() && !browserBellEnabled) || isBellPlaybackActive) return;
    if (testHistoryIdRef.current) {
      updateBellHistoryStatus(testHistoryIdRef.current, 'stopped');
    }
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const historyId = addBellHistory('Pratinjau sirene darurat (5 detik)', time, 'test');
    testHistoryIdRef.current = historyId;
    setIsBellPlaybackActive(true);
    const startFallbackSiren = (error?: string) => {
      if (testHistoryIdRef.current !== historyId) return;
      if (error) {
        console.error('Audio sirene pratinjau gagal:', error);
        alert('Audio sirene pilihan gagal diputar; sirene bawaan dipakai untuk pratinjau.');
      }
      audioEngine.startEmergencySiren();
    };
    const customAudio = appDataRef.current?.settings.emergency_audio_file ?? '';
    if (customAudio) {
      audioEngine.startEmergencyAudio(customAudio, (error) => startFallbackSiren(error));
    } else {
      startFallbackSiren();
    }
    previewTimeoutRef.current = setTimeout(() => {
      previewTimeoutRef.current = null;
      audioEngine.stopEmergencySiren();
      audioEngine.stopBellAudio();
      if (historyId) updateBellHistoryStatus(historyId, 'completed');
      setIsBellPlaybackActive(false);
    }, 5000);
  }, [addBellHistory, browserBellEnabled, isBellPlaybackActive, updateBellHistoryStatus]);

  useEffect(() => () => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
  }, []);

  const handleToggleBrowserBell = () => {
    const enabled = !browserBellEnabled;
    localStorage.setItem(BROWSER_BELL_ENABLED_KEY, String(enabled));
    setBrowserBellEnabled(enabled);
    if (!enabled) {
      if (activeHistoryIdRef.current) {
        updateBellHistoryStatus(activeHistoryIdRef.current, 'stopped');
      }
      if (testHistoryIdRef.current) {
        updateBellHistoryStatus(testHistoryIdRef.current, 'stopped');
      }
      setIsBellPlaybackActive(false);
      audioEngine.stopBellAudio();
      audioEngine.stopEmergencySiren();
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      setActiveBell(null);
    }
  };

  const handleStopBell = useCallback(() => {
    setActiveBell(null);
    setIsBellPlaybackActive(false);
    if (activeHistoryIdRef.current) {
      updateBellHistoryStatus(activeHistoryIdRef.current, 'stopped');
    }
    if (testHistoryIdRef.current) {
      updateBellHistoryStatus(testHistoryIdRef.current, 'stopped');
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    audioEngine.stopEmergencySiren();
    audioEngine.stopBellAudio();
    audioEngine.stopSpeaking();
    tauriBridge.stopBell();
  }, [updateBellHistoryStatus]);

  const handleSignOut = () => {
    if (
      isTauri() &&
      !window.confirm(
        'Keluar akun akan menutup penerima pengumuman remote. Jangan keluar dari komputer TU yang menjalankan bel otomatis. Lanjut keluar?'
      )
    ) {
      return;
    }
    onSignOut();
  };

  // Emergency Bell
  const handleEmergencyTrigger = useCallback(() => {
    handleTriggerBell(
      'PERINGATAN DARURAT: SIRINE SEKOLAH BERBUNYI',
      appDataRef.current?.settings.emergency_audio_file ?? '',
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

  const handleSkipNextBell = async (schedule: { id: string; date: string; time: string }) => {
    await tauriBridge.skipScheduledOccurrence(schedule.id, schedule.date, schedule.time);
    setSkipOccurrenceKey(`${schedule.date}|${schedule.time}|${schedule.id}`);
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

  const handleMusicDuckPercentChange = async (percent: number) => {
    if (!appData) return;
    const updated = {
      ...appData,
      settings: { ...appData.settings, music_duck_percent: percent },
    };
    await tauriBridge.saveAppData(updated);
    setAppData(updated);
  };

  const handleEmergencyAudioChange = async (filePath: string) => {
    if (!appData) return;
    const updated = {
      ...appData,
      settings: { ...appData.settings, emergency_audio_file: filePath },
    };
    await tauriBridge.saveAppData(updated);
    setAppData(updated);
  };

  const handleRestoreBackup = async (data: AppData) => {
    if (volumeSaveTimer.current) {
      clearTimeout(volumeSaveTimer.current);
      volumeSaveTimer.current = null;
    }
    const normalizedData = {
      ...data,
      bell_history: data.bell_history ?? [],
      settings: {
        ...data.settings,
        music_duck_percent: data.settings.music_duck_percent ?? 20,
        emergency_audio_file: data.settings.emergency_audio_file ?? '',
      },
    };
    await tauriBridge.saveAppData(normalizedData);
    audioEngine.stopBellAudio();
    audioEngine.stopSpeaking();
    setIsBellPlaybackActive(false);
    setAppData(normalizedData);
    setMasterVolume(normalizedData.settings.master_volume);
    audioEngine.setVolume(normalizedData.settings.master_volume);
    setCurrentTrack(normalizedData.playlist[0] || null);
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
    message: string,
    onComplete?: () => void
  ) => {
    let prefix = 'Perhatian kepada ';
    if (targetType === 'Siswa') prefix += `siswa bernama ${name}, `;
    else if (targetType === 'Guru') prefix += `Bapak atau Ibu Guru ${name}, `;
    else if (targetType === 'Karyawan') prefix += `staf karyawan ${name}, `;
    else prefix += `seluruh warga sekolah dan tamu undangan, `;

    const dest = `dimohon untuk segera menuju ke ${location}. `;
    const extra = message ? `${message}. ` : '';
    const fullText = `${prefix}${dest}${extra}Terima kasih.`;

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

    audioEngine.speakIndonesian(fullText, {
      pitch: 1.0,
      rate: 0.95,
      volume: 1.0,
      gender: ttsVoiceGender,
      engine: ttsEngine,
      chime: 'bank',
      onEnd: () => {
        onComplete?.();
        const currentData = appDataRef.current;
        if (!currentData) return;
        const updated = { ...currentData, tts_history: [record, ...currentData.tts_history] };
        appDataRef.current = updated;
        setAppData(updated);
        tauriBridge.addTtsRecord(record);
      },
      onError: (error) => {
        onComplete?.();
        alert(`Gagal memutar TTS: ${error}`);
      },
    });
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
      const browserAudioId = deletedTrack ? getBrowserAudioId(deletedTrack.file_path) : null;
      if (browserAudioId) {
        void deleteBrowserAudio(browserAudioId).catch((error: unknown) => {
          console.error('Gagal menghapus file audio browser:', error);
          alert(`File dihapus dari playlist, tetapi file lokal gagal dihapus: ${String(error)}`);
        });
      }
      const updatedPlaylist = appData.playlist.filter((t) => t.id !== id);
      const updatedSettings = deletedTrack?.file_path === appData.settings.emergency_audio_file
        ? { ...appData.settings, emergency_audio_file: '' }
        : appData.settings;
      const updated = { ...appData, settings: updatedSettings, playlist: updatedPlaylist };
      setAppData(updated);
      void tauriBridge.saveAppData(updated).catch((error: unknown) => {
        console.error('Gagal menyimpan playlist setelah menghapus audio:', error);
        alert(`Gagal menyimpan playlist: ${String(error)}`);
      });
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
      await tauriBridge.saveAppData(updated);
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
      await tauriBridge.saveAppData(updated);
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
      const updated = { ...appData, playlist: [track, ...appData.playlist] };
      setAppData(updated);
      await tauriBridge.saveAppData(updated);
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
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <div className="pl-72 max-[1100px]:pl-20 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          academicYear={appData.settings.academic_year}
          schoolName={appData.settings.school_name}
          autoBellEnabled={appData.settings.auto_bell_enabled}
          activeMode={appData.settings.active_mode}
          isDesktop={isTauri()}
          browserBellEnabled={browserBellEnabled}
          onToggleAutoBell={handleToggleAutoBell}
          onToggleBrowserBell={handleToggleBrowserBell}
          onEmergencyTrigger={handleEmergencyTrigger}
        />

        {/* View Routed by Tab */}
        <main className="pt-20 px-4 xl:px-gutter-desktop min-h-[calc(100vh-80px)]">
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
                canPlayBell={isTauri() || browserBellEnabled}
                isBellPlaybackActive={isBellPlaybackActive}
                onTriggerBell={handleTriggerBell}
                onTestBellAudio={handleTestBellAudio}
                onPreviewEmergencyAudio={handlePreviewEmergencyAudio}
                onSkipNextBell={handleSkipNextBell}
                skipOccurrenceKey={skipOccurrenceKey}
                remoteReceiverEnabled={remoteReceiverEnabled}
                remoteReceiverStatus={remoteReceiverStatus}
                onSendTts={handleSendTts}
                onSelectTrack={handleSelectTrack}
                voiceGender={ttsVoiceGender}
                onVoiceGenderChange={handleVoiceGenderChange}
                ttsEngine={ttsEngine}
                isPlayingMusic={isPlayingMusic}
                currentTrack={currentTrack}
                onTogglePlayMusic={handleTogglePlayMusic}
              />
            )}

            {currentTab === 'jadwal' && (
              <ScheduleView
                appData={appData}
                canPlayBell={isTauri() || browserBellEnabled}
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
                ttsEngine={ttsEngine}
                onTtsEngineChange={handleTtsEngineChange}
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
                onMusicDuckPercentChange={handleMusicDuckPercentChange}
                onEmergencyAudioChange={handleEmergencyAudioChange}
                onRestoreBackup={handleRestoreBackup}
                remoteReceiverEnabled={remoteReceiverEnabled}
                remoteReceiverStatus={remoteReceiverStatus}
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
        duckPercent={isBellPlaybackActive ? (appData.settings.music_duck_percent ?? 20) : 100}
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
