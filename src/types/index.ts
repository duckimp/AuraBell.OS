export type ScheduleCategory = 'reguler' | 'ujian' | 'ramadan';

export type TargetCategory = 'Siswa' | 'Guru' | 'Karyawan' | 'Umum';

export interface ScheduleItem {
  id: string;
  time: string;          // "HH:mm" e.g. "07:00"
  title: string;         // e.g. "Masuk Jam Ke-1"
  category: ScheduleCategory;
  days: string[];        // ["Senin", "Selasa", ...]
  audio_file: string;    // e.g. "bel_masuk_3_nada.mp3"
  audio_type: 'standard' | 'custom' | 'tts';
  tts_text?: string;
  active: boolean;
}

export interface AudioTrack {
  id: string;
  title: string;
  duration: string;      // "12:45"
  duration_seconds: number;
  category: string;      // "Senam Pagi" | "Upacara & Lagu Wajib" | "Relaksasi" | "Nada Bel"
  source: 'local' | 'youtube';
  source_url?: string;
  file_path: string;
  date_added: string;
}

export interface TtsCallRecord {
  id: string;
  timestamp: string;
  target_type: TargetCategory;
  target_name: string;
  location: string;
  message: string;
  chime_preset: string;
  full_text: string;
}

export interface HolidayEvent {
  id: string;
  date: string;          // "YYYY-MM-DD"
  title: string;
  is_school_off: boolean;
  description: string;
}

export interface SchoolSettings {
  school_name: string;
  academic_year: string;
  active_mode: ScheduleCategory;
  master_volume: number;
  music_duck_percent: number;
  speaker_zones: string[];
  emergency_bell_active: boolean;
  auto_bell_enabled: boolean;
}

export interface AppData {
  settings: SchoolSettings;
  schedules: ScheduleItem[];
  playlist: AudioTrack[];
  tts_history: TtsCallRecord[];
  holidays: HolidayEvent[];
}

export interface BellTriggerPayload {
  schedule_id?: string;
  title: string;
  time: string;
  audio_file: string;
  audio_type: ScheduleItem['audio_type'];
  tts_text?: string;
  category: string;
  is_emergency: boolean;
}
