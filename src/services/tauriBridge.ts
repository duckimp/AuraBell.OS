import { AppData, AudioTrack, BellTriggerPayload, ScheduleCategory, TtsCallRecord } from '../types';
import { BROWSER_AUDIO_PATH_PREFIX, saveBrowserAudio } from './browserAudioStore';

// Detect whether running inside Tauri desktop app
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Default fallback data for browser mode
const defaultAppData: AppData = {
  settings: {
    school_name: "SMA NEGERI 1 TELADAN",
    academic_year: "T.A. 2024/2025 - Semester Genap",
    active_mode: "reguler",
    master_volume: 85,
    music_duck_percent: 20,
    emergency_audio_file: "",
    speaker_zones: [
      "Hall A & B (Speaker Utama)",
      "Zona Kelas X (10 Ruang)",
      "Zona Kelas XI (10 Ruang)",
      "Zona Kelas XII (10 Ruang)",
      "Lapangan & Area Terbuka",
      "Ruang Guru & Tata Usaha"
    ],
    emergency_bell_active: false,
    auto_bell_enabled: true,
  },
  schedules: [
    {
      id: "reg-1",
      time: "07:00",
      title: "Bel Masuk & Jam Ke-1",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_masuk_3_nada.mp3",
      audio_type: "standard",
      tts_text: "Pintu gerbang ditutup, pelajaran jam pertama segera dimulai.",
      active: true,
    },
    {
      id: "reg-2",
      time: "07:45",
      title: "Pergantian Jam Ke-2",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "westminster_chime.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "reg-3",
      time: "08:30",
      title: "Pergantian Jam Ke-3",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "westminster_chime.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "reg-4",
      time: "09:15",
      title: "Pergantian Jam Ke-4",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "westminster_chime.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "reg-5",
      time: "09:45",
      title: "Istirahat Pertama (1)",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_istirahat.mp3",
      audio_type: "standard",
      tts_text: "Saatnya istirahat pertama. Selamat beristirahat dan jaga kebersihan lingkungan sekolah.",
      active: true,
    },
    {
      id: "reg-6",
      time: "10:15",
      title: "Masuk Kembali Jam Ke-5",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_masuk_3_nada.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "reg-7",
      time: "11:45",
      title: "Istirahat Kedua & Sholat Dzuhur",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis"],
      audio_file: "bel_istirahat.mp3",
      audio_type: "standard",
      tts_text: "Saatnya istirahat kedua dan sholat Dzuhur berjamaah di masjid sekolah.",
      active: true,
    },
    {
      id: "reg-8",
      time: "12:30",
      title: "Masuk Kembali Jam Ke-7",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis"],
      audio_file: "bel_masuk_3_nada.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "reg-9",
      time: "14:45",
      title: "Bel Kepulangan Sekolah",
      category: "reguler",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_pulang.mp3",
      audio_type: "standard",
      tts_text: "Pelajaran hari ini telah selesai. Hati-hati di jalan dan sampai jumpa esok hari.",
      active: true,
    },
    // Ujian
    {
      id: "uj-1",
      time: "07:30",
      title: "Persiapan Ujian Sesi 1",
      category: "ujian",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_masuk_3_nada.mp3",
      audio_type: "standard",
      tts_text: "Peserta ujian memasuki ruangan masing-masing.",
      active: true,
    },
    {
      id: "uj-2",
      time: "09:30",
      title: "Selesai Ujian Sesi 1 / Istirahat",
      category: "ujian",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_istirahat.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "uj-3",
      time: "10:00",
      title: "Mulai Ujian Sesi 2",
      category: "ujian",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_masuk_3_nada.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "uj-4",
      time: "12:00",
      title: "Ujian Selesai & Kepulangan",
      category: "ujian",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_pulang.mp3",
      audio_type: "standard",
      active: true,
    },
    // Ramadan
    {
      id: "ram-1",
      time: "07:30",
      title: "Masuk & Tadarus Pagi",
      category: "ramadan",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_masuk_3_nada.mp3",
      audio_type: "standard",
      tts_text: "Selamat pagi. Seluruh siswa bersiap mengikuti tadarus pagi.",
      active: true,
    },
    {
      id: "ram-2",
      time: "08:00",
      title: "Jam Ke-1 Ramadan",
      category: "ramadan",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "westminster_chime.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "ram-3",
      time: "09:40",
      title: "Istirahat & Sholat Dhuha",
      category: "ramadan",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_istirahat.mp3",
      audio_type: "standard",
      active: true,
    },
    {
      id: "ram-4",
      time: "12:15",
      title: "Kepulangan Sekolah Ramadan",
      category: "ramadan",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      audio_file: "bel_pulang.mp3",
      audio_type: "standard",
      tts_text: "Pelajaran hari ini berakhir. Selamat menjalankan ibadah puasa.",
      active: true,
    },
  ],
  playlist: [],
  tts_history: [],
  bell_history: [],
  holidays: [],
};

const STORAGE_KEY = 'aurabell_data_v1';

export const tauriBridge = {
  async getAutostartEnabled(): Promise<boolean> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<boolean>('get_autostart_enabled');
    }
    return localStorage.getItem('aurabell_autostart') === 'true';
  },

  async setAutostartEnabled(enabled: boolean): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_autostart_enabled', { enabled });
      return;
    }
    localStorage.setItem('aurabell_autostart', String(enabled));
  },

  async fetchAppData(): Promise<AppData> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<AppData>('get_app_data');
      } catch (err) {
        console.warn('Tauri invoke error, falling back to local storage:', err);
      }
    }
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAppData));
    return defaultAppData;
  },

  async saveAppData(data: AppData): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_app_data', { data });
        return;
      } catch (err) {
        console.warn('Tauri save_app_data error, saving to local storage:', err);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  async exportAppBackup(destinationPath: string): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('export_app_backup', { destinationPath });
  },

  async setSystemAudioAlert(active: boolean, requestId: number): Promise<void> {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_system_audio_alert', { active, requestId });
  },

  async restoreAppBackup(sourcePath: string): Promise<AppData> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AppData>('restore_app_backup', { sourcePath });
  },

  async triggerBell(
    title: string,
    audioFile: string,
    category = 'reguler',
    isEmergency = false,
    scheduleId?: string
  ): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('trigger_bell_manual', {
          scheduleId: scheduleId || null,
          title,
          audioFile,
          category,
          isEmergency,
        });
        return;
      } catch (err) {
        console.warn('Tauri trigger_bell_manual error:', err);
      }
    }
    // Web fallback: emit custom DOM event
    window.dispatchEvent(
      new CustomEvent('bell_trigger', {
        detail: {
          schedule_id: scheduleId,
          title,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          audio_file: audioFile,
          audio_type: 'standard',
          category,
          is_emergency: isEmergency,
        } as BellTriggerPayload,
      })
    );
  },

  async skipScheduledOccurrence(scheduleId: string, date: string, time: string): Promise<void> {
    if (!isTauri()) {
      throw new Error('Lewati jadwal otomatis hanya tersedia di aplikasi desktop.');
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('skip_scheduled_occurrence', { scheduleId, date, time });
  },

  async stopBell(): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('stop_current_bell');
        return;
      } catch (err) {
        console.warn('Tauri stop_current_bell error:', err);
      }
    }
    window.dispatchEvent(new CustomEvent('bell_stopped'));
  },

  async addTtsRecord(record: TtsCallRecord): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('add_tts_record', { record });
        return;
      } catch (err) {
        console.warn('Tauri add_tts_record error:', err);
      }
    }
    const data = await this.fetchAppData();
    data.tts_history.unshift(record);
    await this.saveAppData(data);
  },

  async setActiveMode(mode: ScheduleCategory): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_active_mode', { mode });
        return;
      } catch (err) {
        console.warn('Tauri set_active_mode error:', err);
      }
    }
    const data = await this.fetchAppData();
    data.settings.active_mode = mode;
    await this.saveAppData(data);
  },

  async toggleAutoBell(enabled: boolean): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('toggle_auto_bell', { enabled });
        return;
      } catch (err) {
        console.warn('Tauri toggle_auto_bell error:', err);
      }
    }
    const data = await this.fetchAppData();
    data.settings.auto_bell_enabled = enabled;
    await this.saveAppData(data);
  },

  async downloadYouTubeAudio(url: string, category: string, customTitle?: string): Promise<AudioTrack> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<AudioTrack>('download_youtube_audio', {
          url,
          category,
          customTitle: customTitle || null,
        });
      } catch (err) {
        throw new Error(String(err));
      }
    }

    throw new Error('Unduhan YouTube hanya tersedia di aplikasi desktop AuraBell.OS.');
  },

  async importLocalAudio(source: string | File, title: string, category: string): Promise<AudioTrack> {
    if (isTauri()) {
      if (typeof source !== 'string') {
        throw new Error('Gunakan pemilih file desktop untuk memilih audio.');
      }
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<AudioTrack>('import_local_file', {
          sourcePath: source,
          title,
          category,
        });
      } catch (err) {
        throw new Error(String(err));
      }
    }

    const isBrowserFile = source instanceof File;
    const id = `local-${typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Date.now().toString()}`;
    if (isBrowserFile) {
      await saveBrowserAudio(id, source);
    }
    const newTrack: AudioTrack = {
      id,
      title: title || 'Audio Sekolah Baru',
      duration: '04:15',
      duration_seconds: 255,
      category,
      source: 'local',
      file_path: isBrowserFile ? `${BROWSER_AUDIO_PATH_PREFIX}${id}` : source,
      date_added: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    if (!isBrowserFile) {
      const data = await this.fetchAppData();
      data.playlist.unshift(newTrack);
      await this.saveAppData(data);
    }
    return newTrack;
  },

  onBellTrigger(callback: (payload: BellTriggerPayload) => void): () => void {
    if (isTauri()) {
      let unlisten: (() => void) | null = null;
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<BellTriggerPayload>('bell_trigger', (event) => {
          callback(event.payload);
        }).then((unsub) => {
          unlisten = unsub;
        });
      });
      return () => {
        if (unlisten) unlisten();
      };
    }

    const handler = (e: Event) => {
      const custom = e as CustomEvent<BellTriggerPayload>;
      callback(custom.detail);
    };
    window.addEventListener('bell_trigger', handler);
    return () => window.removeEventListener('bell_trigger', handler);
  },

  onBellStopped(callback: () => void): () => void {
    if (isTauri()) {
      let unlisten: (() => void) | null = null;
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('bell_stopped', () => {
          callback();
        }).then((unsub) => {
          unlisten = unsub;
        });
      });
      return () => {
        if (unlisten) unlisten();
      };
    }

    const handler = () => callback();
    window.addEventListener('bell_stopped', handler);
    return () => window.removeEventListener('bell_stopped', handler);
  },
};
