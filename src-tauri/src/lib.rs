use chrono::{Datelike, Local};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{Menu, MenuItem};
use tauri::path::BaseDirectory;
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

static TTS_AUDIO_COUNTER: AtomicU64 = AtomicU64::new(0);

fn tts_resource_path(app: &AppHandle, relative_path: &str) -> Result<PathBuf, String> {
    let resource_path = app
        .path()
        .resolve(
            format!("resources/tts/{relative_path}"),
            BaseDirectory::Resource,
        )
        .map_err(|error| format!("Lokasi resource TTS tidak ditemukan: {error}"))?;
    if resource_path.exists() {
        return Ok(resource_path);
    }

    #[cfg(debug_assertions)]
    {
        let development_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("tts")
            .join(relative_path);
        if development_path.exists() {
            return Ok(development_path);
        }
    }

    Err(format!(
        "Resource TTS tidak tersedia di {}. Jalankan ulang build desktop agar resource TTS disiapkan.",
        resource_path.display()
    ))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleItem {
    pub id: String,
    pub time: String,          // "07:00"
    pub title: String,         // "Masuk Jam Ke-1"
    pub category: String,      // "reguler" | "ujian" | "ramadan"
    pub days: Vec<String>,     // ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
    pub audio_file: String,    // "bel_masuk_3_nada.mp3"
    pub audio_type: String,    // "standard" | "custom" | "tts"
    pub tts_text: Option<String>,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioTrack {
    pub id: String,
    pub title: String,
    pub duration: String,
    pub duration_seconds: u32,
    pub category: String,      // "Senam Pagi", "Upacara & Lagu Wajib", "Relaksasi", "Nada Bel"
    pub source: String,        // "local" | "youtube"
    pub source_url: Option<String>,
    pub file_path: String,
    pub date_added: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsCallRecord {
    pub id: String,
    pub timestamp: String,
    pub target_type: String,   // "Siswa", "Guru", "Karyawan", "Umum"
    pub target_name: String,
    pub location: String,
    pub message: String,
    pub chime_preset: String,
    pub full_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HolidayEvent {
    pub id: String,
    pub date: String,
    pub title: String,
    pub is_school_off: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchoolSettings {
    pub school_name: String,
    pub academic_year: String,
    pub active_mode: String,   // "reguler" | "ujian" | "ramadan"
    pub master_volume: u8,
    pub speaker_zones: Vec<String>,
    pub emergency_bell_active: bool,
    pub auto_bell_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub settings: SchoolSettings,
    pub schedules: Vec<ScheduleItem>,
    pub playlist: Vec<AudioTrack>,
    pub tts_history: Vec<TtsCallRecord>,
    pub holidays: Vec<HolidayEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupAudioFile {
    original_path: String,
    archive_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppBackup {
    format_version: u32,
    data: AppData,
    audio_files: Vec<BackupAudioFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BellTriggerPayload {
    pub schedule_id: Option<String>,
    pub title: String,
    pub time: String,
    pub audio_file: String,
    pub audio_type: String,
    pub tts_text: Option<String>,
    pub category: String,
    pub is_emergency: bool,
}

pub struct AppState {
    pub data: Arc<Mutex<AppData>>,
    pub last_triggered_minute: Arc<Mutex<String>>,
}

fn get_data_file_path(app: &AppHandle) -> PathBuf {
    let mut path = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = fs::create_dir_all(&path);
    path.push("aurabell_data.json");
    path
}

fn get_audio_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Tidak dapat menentukan folder data aplikasi: {e}"))?;
    path.push("audio");
    fs::create_dir_all(&path)
        .map_err(|e| format!("Tidak dapat membuat folder audio: {e}"))?;
    Ok(path)
}

fn create_default_data() -> AppData {
    AppData {
        settings: SchoolSettings {
            school_name: "SMA NEGERI 1 TELADAN".to_string(),
            academic_year: "T.A. 2024/2025 - Semester Genap".to_string(),
            active_mode: "reguler".to_string(),
            master_volume: 85,
            speaker_zones: vec![
                "Hall A & B (Speaker Utama)".to_string(),
                "Zona Kelas X (10 Ruang)".to_string(),
                "Zona Kelas XI (10 Ruang)".to_string(),
                "Zona Kelas XII (10 Ruang)".to_string(),
                "Lapangan & Area Terbuka".to_string(),
                "Ruang Guru & Tata Usaha".to_string(),
            ],
            emergency_bell_active: false,
            auto_bell_enabled: true,
        },
        schedules: vec![
            ScheduleItem {
                id: "reg-1".to_string(),
                time: "07:00".to_string(),
                title: "Bel Masuk & Jam Ke-1".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_masuk_3_nada.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: Some("Pintu gerbang ditutup, pelajaran jam pertama segera dimulai.".to_string()),
                active: true,
            },
            ScheduleItem {
                id: "reg-2".to_string(),
                time: "07:45".to_string(),
                title: "Pergantian Jam Ke-2".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "westminster_chime.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "reg-3".to_string(),
                time: "08:30".to_string(),
                title: "Pergantian Jam Ke-3".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "westminster_chime.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "reg-4".to_string(),
                time: "09:15".to_string(),
                title: "Pergantian Jam Ke-4".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "westminster_chime.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "reg-5".to_string(),
                time: "09:45".to_string(),
                title: "Istirahat Pertama (1)".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_istirahat.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: Some("Saatnya istirahat pertama. Selamat beristirahat dan jaga kebersihan lingkungan sekolah.".to_string()),
                active: true,
            },
            ScheduleItem {
                id: "reg-6".to_string(),
                time: "10:15".to_string(),
                title: "Masuk Kembali Jam Ke-5".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_masuk_3_nada.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "reg-7".to_string(),
                time: "11:45".to_string(),
                title: "Istirahat Kedua & Sholat Dzuhur".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string()],
                audio_file: "bel_istirahat.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: Some("Saatnya istirahat kedua dan sholat Dzuhur berjamaah di masjid sekolah.".to_string()),
                active: true,
            },
            ScheduleItem {
                id: "reg-8".to_string(),
                time: "12:30".to_string(),
                title: "Masuk Kembali Jam Ke-7".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string()],
                audio_file: "bel_masuk_3_nada.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "reg-9".to_string(),
                time: "14:45".to_string(),
                title: "Bel Kepulangan Sekolah".to_string(),
                category: "reguler".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_pulang.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: Some("Pelajaran hari ini telah selesai. Hati-hati di jalan dan sampai jumpa esok hari.".to_string()),
                active: true,
            },
            // Mode Ujian (waktu lebih presisi)
            ScheduleItem {
                id: "uj-1".to_string(),
                time: "07:30".to_string(),
                title: "Persiapan Ujian Sesi 1".to_string(),
                category: "ujian".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_masuk_3_nada.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: Some("Peserta ujian memasuki ruangan masing-masing.".to_string()),
                active: true,
            },
            ScheduleItem {
                id: "uj-2".to_string(),
                time: "09:30".to_string(),
                title: "Selesai Ujian Sesi 1 / Istirahat".to_string(),
                category: "ujian".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_istirahat.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "uj-3".to_string(),
                time: "10:00".to_string(),
                title: "Mulai Ujian Sesi 2".to_string(),
                category: "ujian".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_masuk_3_nada.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "uj-4".to_string(),
                time: "12:00".to_string(),
                title: "Ujian Selesai & Kepulangan".to_string(),
                category: "ujian".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_pulang.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            // Mode Ramadan (jam lebih awal dan durasi per jam dipersingkat 30-35 menit)
            ScheduleItem {
                id: "ram-1".to_string(),
                time: "07:30".to_string(),
                title: "Masuk & Tadarus Pagi".to_string(),
                category: "ramadan".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_masuk_3_nada.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: Some("Selamat pagi. Seluruh siswa bersiap mengikuti tadarus pagi di kelas masing-masing.".to_string()),
                active: true,
            },
            ScheduleItem {
                id: "ram-2".to_string(),
                time: "08:00".to_string(),
                title: "Jam Ke-1 Ramadan".to_string(),
                category: "ramadan".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "westminster_chime.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "ram-3".to_string(),
                time: "09:40".to_string(),
                title: "Istirahat & Sholat Dhuha".to_string(),
                category: "ramadan".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_istirahat.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: None,
                active: true,
            },
            ScheduleItem {
                id: "ram-4".to_string(),
                time: "12:15".to_string(),
                title: "Kepulangan Sekolah Ramadan".to_string(),
                category: "ramadan".to_string(),
                days: vec!["Senin".to_string(), "Selasa".to_string(), "Rabu".to_string(), "Kamis".to_string(), "Jumat".to_string()],
                audio_file: "bel_pulang.mp3".to_string(),
                audio_type: "standard".to_string(),
                tts_text: Some("Pelajaran hari ini berakhir. Selamat menjalankan ibadah puasa.".to_string()),
                active: true,
            },
        ],
        playlist: Vec::new(),
        tts_history: Vec::new(),
        holidays: Vec::new(),
    }
}

fn load_app_data(app: &AppHandle) -> AppData {
    let file_path = get_data_file_path(app);
    if file_path.exists() {
        if let Ok(content) = fs::read_to_string(&file_path) {
            if let Ok(data) = serde_json::from_str::<AppData>(&content) {
                return data;
            }
        }
    }
    let default_data = create_default_data();
    let _ = fs::write(
        &file_path,
        serde_json::to_string_pretty(&default_data).unwrap_or_default(),
    );
    default_data
}

fn persist_app_data(app: &AppHandle, data: &AppData) -> Result<(), String> {
    let file_path = get_data_file_path(app);
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(file_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn add_backup_audio(
    original_path: &str,
    audio_files: &mut Vec<BackupAudioFile>,
    paths: &mut HashMap<String, PathBuf>,
) -> Result<(), String> {
    if paths.contains_key(original_path) {
        return Ok(());
    }
    let path = PathBuf::from(original_path);
    if !path.is_file() {
        return Err(format!(
            "File audio tidak ditemukan, backup dibatalkan: {original_path}"
        ));
    }

    let archive_path = format!("audio/{}.bin", audio_files.len());
    audio_files.push(BackupAudioFile {
        original_path: original_path.to_string(),
        archive_path,
    });
    paths.insert(original_path.to_string(), path);
    Ok(())
}

fn indonesian_day_name(weekday: chrono::Weekday) -> &'static str {
    match weekday {
        chrono::Weekday::Mon => "Senin",
        chrono::Weekday::Tue => "Selasa",
        chrono::Weekday::Wed => "Rabu",
        chrono::Weekday::Thu => "Kamis",
        chrono::Weekday::Fri => "Jumat",
        chrono::Weekday::Sat => "Sabtu",
        chrono::Weekday::Sun => "Minggu",
    }
}

fn reveal_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        log::warn!("Jendela utama tidak ditemukan saat bel terjadwal berbunyi");
        return;
    };

    if let Err(error) = window.unminimize() {
        log::warn!("Tidak dapat memulihkan jendela AuraBell.OS: {error}");
    }
    if let Err(error) = window.show() {
        log::warn!("Tidak dapat menampilkan jendela AuraBell.OS: {error}");
    }
    if let Err(error) = window.set_focus() {
        log::warn!("Tidak dapat memfokuskan jendela AuraBell.OS: {error}");
    }
}

// ----------------- Tauri Commands -----------------

#[tauri::command]
fn get_app_data(state: tauri::State<AppState>) -> AppData {
    state.data.lock().unwrap().clone()
}

#[tauri::command]
fn save_app_data(
    app: AppHandle,
    state: tauri::State<AppState>,
    data: AppData,
) -> Result<(), String> {
    let mut current = state.data.lock().unwrap();
    *current = data.clone();
    persist_app_data(&app, &data)?;
    let _ = app.emit("data_updated", ());
    Ok(())
}

#[tauri::command]
fn export_app_backup(
    state: tauri::State<AppState>,
    destination_path: String,
) -> Result<(), String> {
    let data = state.data.lock().map_err(|e| e.to_string())?.clone();
    let mut audio_files = Vec::new();
    let mut audio_paths = HashMap::new();

    for track in &data.playlist {
        add_backup_audio(&track.file_path, &mut audio_files, &mut audio_paths)?;
    }
    for schedule in &data.schedules {
        if schedule.audio_type == "custom" && !schedule.audio_file.is_empty() {
            add_backup_audio(
                &schedule.audio_file,
                &mut audio_files,
                &mut audio_paths,
            )?;
        }
    }

    let backup = AppBackup {
        format_version: 1,
        data,
        audio_files,
    };
    let destination = File::create(&destination_path)
        .map_err(|e| format!("Tidak dapat membuat file backup: {e}"))?;
    let mut archive = ZipWriter::new(destination);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    archive
        .start_file("aurabell-backup.json", options)
        .map_err(|e| format!("Tidak dapat menulis metadata backup: {e}"))?;
    let metadata =
        serde_json::to_vec(&backup).map_err(|e| format!("Gagal menyiapkan data backup: {e}"))?;
    archive
        .write_all(&metadata)
        .map_err(|e| format!("Gagal menulis metadata backup: {e}"))?;

    for audio in &backup.audio_files {
        let source = audio_paths
            .get(&audio.original_path)
            .ok_or_else(|| format!("Path audio backup tidak ditemukan: {}", audio.original_path))?;
        archive
            .start_file(&audio.archive_path, options)
            .map_err(|e| format!("Gagal menyiapkan file audio backup: {e}"))?;
        let mut file = File::open(source)
            .map_err(|e| format!("Tidak dapat membaca audio {}: {e}", source.display()))?;
        std::io::copy(&mut file, &mut archive)
            .map_err(|e| format!("Gagal menyalin audio ke backup: {e}"))?;
    }

    archive
        .finish()
        .map_err(|e| format!("Gagal menyelesaikan file backup: {e}"))?;
    Ok(())
}

#[tauri::command]
fn restore_app_backup(
    app: AppHandle,
    state: tauri::State<AppState>,
    source_path: String,
) -> Result<AppData, String> {
    let file = File::open(&source_path).map_err(|e| format!("Tidak dapat membuka backup: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("File bukan backup AuraBell.OS yang valid: {e}"))?;
    let mut metadata_file = archive
        .by_name("aurabell-backup.json")
        .map_err(|e| format!("Metadata backup tidak ditemukan: {e}"))?;
    let mut metadata = Vec::new();
    metadata_file
        .read_to_end(&mut metadata)
        .map_err(|e| format!("Tidak dapat membaca metadata backup: {e}"))?;
    drop(metadata_file);

    let mut backup: AppBackup = serde_json::from_slice(&metadata)
        .map_err(|e| format!("Isi backup tidak valid: {e}"))?;
    if backup.format_version != 1 {
        return Err(format!(
            "Versi backup {} tidak didukung.",
            backup.format_version
        ));
    }

    let audio_dir = get_audio_dir(&app)?;
    let restore_id = Local::now().timestamp_millis();
    let mut restored_paths = HashMap::new();
    for (index, audio) in backup.audio_files.iter().enumerate() {
        let extension = PathBuf::from(&audio.original_path)
            .extension()
            .and_then(|value| value.to_str())
            .filter(|value| matches!(value.to_ascii_lowercase().as_str(), "mp3" | "wav" | "m4a" | "ogg"))
            .map(str::to_string)
            .ok_or_else(|| format!("Format audio backup tidak didukung: {}", audio.original_path))?;
        let destination = audio_dir.join(format!("{restore_id}_{index}.{extension}"));
        let mut archived_audio = archive
            .by_name(&audio.archive_path)
            .map_err(|e| format!("Audio backup tidak lengkap: {e}"))?;
        let mut output = File::create(&destination)
            .map_err(|e| format!("Tidak dapat menyimpan audio hasil restore: {e}"))?;
        std::io::copy(&mut archived_audio, &mut output)
            .map_err(|e| format!("Gagal memulihkan audio: {e}"))?;
        restored_paths.insert(
            audio.original_path.clone(),
            destination.to_string_lossy().to_string(),
        );
    }

    for track in &mut backup.data.playlist {
        if let Some(path) = restored_paths.get(&track.file_path) {
            track.file_path = path.clone();
        }
    }
    for schedule in &mut backup.data.schedules {
        if let Some(path) = restored_paths.get(&schedule.audio_file) {
            schedule.audio_file = path.clone();
        }
    }

    persist_app_data(&app, &backup.data)?;
    {
        let mut current = state.data.lock().map_err(|e| e.to_string())?;
        *current = backup.data.clone();
    }
    let _ = app.emit("data_updated", ());
    Ok(backup.data)
}

#[tauri::command]
fn trigger_bell_manual(
    app: AppHandle,
    schedule_id: Option<String>,
    title: String,
    audio_file: String,
    category: String,
    is_emergency: bool,
) -> Result<(), String> {
    let payload = BellTriggerPayload {
        schedule_id,
        title,
        time: Local::now().format("%H:%M").to_string(),
        audio_file,
        audio_type: "standard".to_string(),
        tts_text: None,
        category,
        is_emergency,
    };
    app.emit("bell_trigger", payload)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn stop_current_bell(app: AppHandle) -> Result<(), String> {
    app.emit("bell_stopped", ()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_tts_record(
    app: AppHandle,
    state: tauri::State<AppState>,
    record: TtsCallRecord,
) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    data.tts_history.insert(0, record);
    persist_app_data(&app, &data)?;
    let _ = app.emit("data_updated", ());
    Ok(())
}

#[tauri::command]
async fn synthesize_offline_tts(
    app: AppHandle,
    text: String,
    rate: f64,
) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || synthesize_offline_tts_blocking(app, text, rate))
        .await
        .map_err(|error| format!("Proses sintesis TTS gagal: {error}"))?
}

fn synthesize_offline_tts_blocking(
    app: AppHandle,
    text: String,
    rate: f64,
) -> Result<Vec<u8>, String> {
    let text = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if text.is_empty() {
        return Err("Teks TTS tidak boleh kosong.".to_string());
    }
    if text.chars().count() > 2000 {
        return Err("Teks TTS terlalu panjang (maksimal 2.000 karakter).".to_string());
    }
    if !rate.is_finite() {
        return Err("Kecepatan bicara TTS tidak valid.".to_string());
    }
    let length_scale = format!("{:.3}", 1.0 / rate.clamp(0.7, 1.3));

    let piper_dir = tts_resource_path(&app, "piper")?;
    let model_path = tts_resource_path(&app, "model/id_ID-news_tts-medium-q8.onnx")?;
    let config_path = tts_resource_path(&app, "model/id_ID-news_tts-medium-q8.onnx.json")?;

    #[cfg(target_os = "windows")]
    let executable = piper_dir.join("piper.exe");
    #[cfg(not(target_os = "windows"))]
    let executable = piper_dir.join("piper");

    let espeak_data = piper_dir.join("espeak-ng-data");
    for (label, path) in [
        ("Piper", &executable),
        ("Model suara", &model_path),
        ("Konfigurasi model suara", &config_path),
        ("Data eSpeak", &espeak_data),
    ] {
        if !path.exists() {
            return Err(format!(
                "{label} tidak tersedia di {}. Jalankan ulang build desktop agar resource TTS disiapkan.",
                path.display()
            ));
        }
    }

    let output_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Folder data aplikasi tidak tersedia: {error}"))?
        .join("tts-cache");
    fs::create_dir_all(&output_dir)
        .map_err(|error| format!("Gagal menyiapkan cache TTS: {error}"))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Waktu sistem tidak valid: {error}"))?
        .as_nanos();
    let sequence = TTS_AUDIO_COUNTER.fetch_add(1, Ordering::Relaxed);
    let output_path = output_dir.join(format!(
        "aurabell-tts-{}-{timestamp}-{sequence}.wav",
        std::process::id()
    ));

    let mut child = Command::new(&executable)
        .arg("--model")
        .arg(&model_path)
        .arg("--output_file")
        .arg(&output_path)
        .arg("--length_scale")
        .arg(length_scale)
        .arg("--espeak_data")
        .arg(&espeak_data)
        .current_dir(&piper_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Gagal menjalankan engine Piper: {error}"))?;

    let write_result = child
        .stdin
        .take()
        .ok_or_else(|| "Input engine Piper tidak tersedia.".to_string())
        .and_then(|mut stdin| {
            stdin
                .write_all(text.as_bytes())
                .and_then(|_| stdin.write_all(b"\n"))
                .map_err(|error| format!("Gagal mengirim teks ke Piper: {error}"))
        });

    if let Err(error) = write_result {
        let _ = child.kill();
        let _ = child.wait();
        return Err(error);
    }

    let result = child
        .wait_with_output()
        .map_err(|error| format!("Gagal menunggu hasil sintesis Piper: {error}"))?;
    if !result.status.success() {
        let _ = fs::remove_file(&output_path);
        let details = String::from_utf8_lossy(&result.stderr).trim().to_string();
        return Err(if details.is_empty() {
            format!("Engine Piper berhenti dengan status {}.", result.status)
        } else {
            format!("Engine Piper gagal: {details}")
        });
    }

    let audio = match fs::read(&output_path) {
        Ok(audio) => audio,
        Err(error) => {
            let _ = fs::remove_file(&output_path);
            return Err(format!("Gagal membaca hasil audio Piper: {error}"));
        }
    };
    if audio.len() <= 44 || &audio[..4] != b"RIFF" {
        let _ = fs::remove_file(&output_path);
        return Err("Piper menghasilkan file audio yang kosong.".to_string());
    }
    fs::remove_file(&output_path)
        .map_err(|error| format!("Gagal membersihkan file sementara TTS: {error}"))?;

    Ok(audio)
}

#[tauri::command]
fn clear_tts_records(app: AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    data.tts_history.clear();
    persist_app_data(&app, &data)?;
    let _ = app.emit("data_updated", ());
    Ok(())
}

#[tauri::command]
fn set_active_mode(
    app: AppHandle,
    state: tauri::State<AppState>,
    mode: String,
) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    data.settings.active_mode = mode;
    persist_app_data(&app, &data)?;
    let _ = app.emit("data_updated", ());
    Ok(())
}

#[tauri::command]
fn toggle_auto_bell(
    app: AppHandle,
    state: tauri::State<AppState>,
    enabled: bool,
) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    data.settings.auto_bell_enabled = enabled;
    persist_app_data(&app, &data)?;
    let _ = app.emit("data_updated", ());
    Ok(())
}

#[tauri::command]
fn get_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_autostart_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn download_youtube_audio(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    url: String,
    category: String,
    custom_title: Option<String>,
) -> Result<AudioTrack, String> {
    let target_dir = get_audio_dir(&app)?;
    let output_template = target_dir
        .join("%(title)s.%(ext)s")
        .to_string_lossy()
        .to_string();

    // Call yt-dlp to extract clean audio to mp3 without ads
    let output = Command::new("yt-dlp")
        .args([
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "0",
            "--no-playlist",
            "--print",
            "after_move:filepath",
            "--print",
            "title",
            "--print",
            "duration",
            "-o",
            &output_template,
            &url,
        ])
        .output()
        .map_err(|e| format!("Gagal menjalankan yt-dlp: {}. Pastikan yt-dlp & ffmpeg terinstal.", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Gagal mengunduh audio YouTube: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.trim().lines().collect();

    let title = custom_title.unwrap_or_else(|| {
        if lines.len() >= 2 {
            lines[1].trim().to_string()
        } else {
            "Audio YouTube Unduhan".to_string()
        }
    });

    let duration_secs: u32 = if lines.len() >= 3 {
        lines[2].trim().parse::<u32>().unwrap_or(180)
    } else {
        180
    };

    let dur_min = duration_secs / 60;
    let dur_sec = duration_secs % 60;
    let duration_str = format!("{:02}:{:02}", dur_min, dur_sec);

    let saved_file = if !lines.is_empty() {
        lines[0].trim().to_string()
    } else {
        target_dir.join("download.mp3").to_string_lossy().to_string()
    };

    let new_track = AudioTrack {
        id: format!("yt-{}", chrono::Local::now().timestamp_millis()),
        title,
        duration: duration_str,
        duration_seconds: duration_secs,
        category,
        source: "youtube".to_string(),
        source_url: Some(url),
        file_path: saved_file,
        date_added: chrono::Local::now().format("%d %b %Y").to_string(),
    };

    // Add to playlist store
    {
        let mut data = state.data.lock().unwrap();
        data.playlist.insert(0, new_track.clone());
        persist_app_data(&app, &data)?;
    }
    let _ = app.emit("data_updated", ());

    Ok(new_track)
}

#[tauri::command]
fn import_local_file(
    app: AppHandle,
    state: tauri::State<AppState>,
    source_path: String,
    title: String,
    category: String,
) -> Result<AudioTrack, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("File audio asal tidak ditemukan!".to_string());
    }

    let filename = source
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("audio.mp3");

    let extension = source
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(extension.as_str(), "mp3" | "wav" | "m4a" | "ogg") {
        return Err("Format audio tidak didukung. Pilih MP3, WAV, M4A, atau OGG.".to_string());
    }

    let target_dir = get_audio_dir(&app)?;
    let target_file = target_dir.join(format!(
        "{}_{}",
        chrono::Local::now().timestamp_millis(),
        filename
    ));
    fs::copy(&source, &target_file)
        .map_err(|e| format!("Tidak dapat menyalin file audio: {e}"))?;

    let new_track = AudioTrack {
        id: format!("local-{}", chrono::Local::now().timestamp_millis()),
        title,
        duration: "04:30".to_string(),
        duration_seconds: 270,
        category,
        source: "local".to_string(),
        source_url: None,
        file_path: target_file.to_string_lossy().to_string(),
        date_added: chrono::Local::now().format("%d %b %Y").to_string(),
    };

    {
        let mut data = state.data.lock().unwrap();
        data.playlist.insert(0, new_track.clone());
        persist_app_data(&app, &data)?;
    }
    let _ = app.emit("data_updated", ());

    Ok(new_track)
}

// ----------------- Background Bell Scheduler -----------------

fn start_scheduler_thread(
    app: AppHandle,
    state: Arc<Mutex<AppData>>,
    last_minute: Arc<Mutex<String>>,
) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(1));

            let now = Local::now();
            let current_hm = now.format("%H:%M").to_string();
            let indonesian_day = indonesian_day_name(now.weekday());

            let mut item_to_trigger: Option<ScheduleItem> = None;

            let should_check_minute = {
                let mut last = last_minute.lock().unwrap();
                if *last != current_hm {
                    *last = current_hm.clone();
                    true
                } else {
                    false
                }
            };

            if should_check_minute {
                let data = state.lock().unwrap();

                // Check if auto bell enabled
                if data.settings.auto_bell_enabled {
                    // Check if today is marked as school off holiday
                    let current_ymd = now.format("%Y-%m-%d").to_string();
                    let is_holiday = data
                        .holidays
                        .iter()
                        .any(|h| h.date == current_ymd && h.is_school_off);

                    if !is_holiday {
                        let active_mode = &data.settings.active_mode;

                        for item in &data.schedules {
                            if item.active
                                && &item.category == active_mode
                                && item.time == current_hm
                                && item.days.iter().any(|d| d == indonesian_day)
                            {
                                item_to_trigger = Some(item.clone());
                                break;
                            }
                        }
                    }
                }
            }

            if let Some(item) = item_to_trigger {
                reveal_main_window(&app);
                let payload = BellTriggerPayload {
                    schedule_id: Some(item.id),
                    title: item.title,
                    time: current_hm,
                    audio_file: item.audio_file,
                    audio_type: item.audio_type,
                    tts_text: item.tts_text,
                    category: item.category,
                    is_emergency: false,
                };
                if let Err(error) = app.emit("bell_trigger", payload) {
                    log::error!("Gagal mengirim event bel terjadwal ke aplikasi: {error}");
                }
            }
        }
    });
}

// ----------------- App Entry Point -----------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let initial_data = load_app_data(app.handle());
            let data_arc = Arc::new(Mutex::new(initial_data));
            let last_min_arc = Arc::new(Mutex::new(String::new()));

            // Launch background bell automation thread
            start_scheduler_thread(app.handle().clone(), data_arc.clone(), last_min_arc.clone());

            app.manage(AppState {
                data: data_arc,
                last_triggered_minute: last_min_arc,
            });

            let show_item = MenuItem::with_id(app, "show", "Buka AuraBell.OS", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Keluar", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            let mut tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("AuraBell.OS")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data,
            save_app_data,
            export_app_backup,
            restore_app_backup,
            trigger_bell_manual,
            stop_current_bell,
            add_tts_record,
            synthesize_offline_tts,
            clear_tts_records,
            set_active_mode,
            toggle_auto_bell,
            get_autostart_enabled,
            set_autostart_enabled,
            download_youtube_audio,
            import_local_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building AuraBell.OS")
        .run(|app_handle, event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } = event
            {
                if let Some(window) = app_handle.get_webview_window(&label) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
}
