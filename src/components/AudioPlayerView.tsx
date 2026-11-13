import React, { useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  Music2,
  Upload,
  Video,
  Plus,
  Play,
  Pause,
  Trash2,
  Download,
  Calendar,
  Check,
  Radio,
  FileAudio,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AppData, AudioTrack } from '../types';
import { isTauri } from '../services/tauriBridge';
import {
  fetchRemoteAudioLibrary,
  RemoteAudioAction,
  RemoteAudioTrack,
} from '../services/remoteAnnouncements';

interface AudioPlayerViewProps {
  appData: AppData;
  onSelectTrack: (track: AudioTrack) => void;
  currentTrack: AudioTrack | null;
  isPlayingMusic: boolean;
  onTogglePlayMusic: () => void;
  onDeleteTrack: (trackId: string) => void;
  onImportYouTube: (url: string, category: string, title?: string) => Promise<void>;
  onImportLocal: (file: File | string, category: string) => Promise<AudioTrack>;
  onAddToSchedule: (track: AudioTrack) => void;
  onRemoteAudioCommand: (action: RemoteAudioAction, trackId?: string) => Promise<void>;
}

export const AudioPlayerView: React.FC<AudioPlayerViewProps> = ({
  appData,
  onSelectTrack,
  currentTrack,
  isPlayingMusic,
  onTogglePlayMusic,
  onDeleteTrack,
  onImportYouTube,
  onImportLocal,
  onAddToSchedule,
  onRemoteAudioCommand,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytCategory, setYtCategory] = useState('Senam Pagi');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Local file import state
  const [localCategory, setLocalCategory] = useState('Senam Pagi');
  const [localImportError, setLocalImportError] = useState<string | null>(null);
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const localFileInput = useRef<HTMLInputElement>(null);
  const [remoteTracks, setRemoteTracks] = useState<RemoteAudioTrack[]>([]);
  const [remoteOnline, setRemoteOnline] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteActionBusy, setRemoteActionBusy] = useState(false);

  const categories = [
    'Semua',
    'Senam Pagi',
    'Upacara & Lagu Wajib',
    'Relaksasi',
    'Nada Bel',
  ];

  const filteredPlaylist = appData.playlist.filter((tr) => {
    if (selectedCategory === 'Semua') return true;
    return tr.category === selectedCategory;
  });

  const refreshRemoteLibrary = async () => {
    setRemoteLoading(true);
    setRemoteError(null);
    try {
      const catalog = await fetchRemoteAudioLibrary();
      setRemoteTracks(catalog.tracks);
      setRemoteOnline(catalog.isOnline);
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : String(error));
      setRemoteOnline(false);
    } finally {
      setRemoteLoading(false);
    }
  };

  React.useEffect(() => {
    void refreshRemoteLibrary();
    const timer = setInterval(() => void refreshRemoteLibrary(), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleRemoteAudioAction = async (action: RemoteAudioAction, trackId?: string) => {
    setRemoteActionBusy(true);
    setRemoteError(null);
    try {
      await onRemoteAudioCommand(action, trackId);
      setRemoteError(`Perintah ${action === 'play' ? 'putar' : action === 'pause' ? 'jeda' : 'berhenti'} terkirim ke Ruang TU.`);
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : String(error));
    } finally {
      setRemoteActionBusy(false);
    }
  };

  const handleYtDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      await onImportYouTube(ytUrl, ytCategory, ytTitle || undefined);
      setYtUrl('');
      setYtTitle('');
    } catch (err: any) {
      setDownloadError(err.message || 'Gagal mengunduh audio YouTube');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalImportError(null);
    setIsImportingLocal(true);
    try {
      await onImportLocal(file, localCategory);
    } catch (err) {
      setLocalImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImportingLocal(false);
      e.target.value = '';
    }
  };

  const handleChooseLocalFile = async () => {
    if (!isTauri()) {
      localFileInput.current?.click();
      return;
    }

    setLocalImportError(null);
    setIsImportingLocal(true);
    try {
      const selected = await open({
        title: 'Pilih file audio lokal',
        multiple: false,
        filters: [{ name: 'File audio', extensions: ['mp3', 'wav', 'm4a', 'ogg'] }],
      });
      if (typeof selected === 'string') await onImportLocal(selected, localCategory);
    } catch (err) {
      setLocalImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImportingLocal(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-lg pb-32">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold uppercase tracking-wider">
              Manajemen Media Audio
            </span>
            <span className="text-on-surface-variant text-xs">
              • {isTauri() ? 'Offline-Ready 100% Bebas Iklan' : 'Putar di perangkat ini'}
            </span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight">
            Pustaka Lagu Senam, Upacara & Audio Sekolah
          </h1>
          <p className="text-on-surface-variant text-sm">
            {isTauri()
              ? 'Tarik audio bersih tanpa jeda iklan dari YouTube atau unggah file lokal untuk pemutaran senam pagi sekolah.'
              : 'Unggah lagu senam ke browser ini untuk diputar langsung di perangkat, atau kirim perintah ke komputer TU.'}
          </p>
        </div>
      </div>

      {!isTauri() && (
        <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary-fixed/20 p-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 pb-3">
            <div className="flex items-start gap-2">
              <Radio className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-headline text-base font-bold text-primary">Putar ke Speaker Ruang TU</h2>
                <p className="text-xs text-on-surface-variant">
                  Pilih lagu dari pustaka komputer TU. File tetap diputar di komputer TU; browser ini hanya mengirim kontrol.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                remoteOnline ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {remoteOnline ? 'Receiver TU online' : 'Receiver TU offline'}
              </span>
              <button
                type="button"
                onClick={() => void refreshRemoteLibrary()}
                disabled={remoteLoading}
                className="rounded-lg border border-outline-variant/50 px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-white disabled:opacity-50"
              >
                {remoteLoading ? 'Memuat...' : 'Segarkan pustaka'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRemoteAudioAction('pause')}
              disabled={!remoteOnline || remoteActionBusy}
              className="rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-xs font-bold text-on-surface hover:border-primary disabled:opacity-50"
            >
              Jeda di TU
            </button>
            <button
              type="button"
              onClick={() => void handleRemoteAudioAction('stop')}
              disabled={!remoteOnline || remoteActionBusy}
              className="rounded-lg border border-error/30 bg-white px-3 py-2 text-xs font-bold text-error hover:bg-error-container disabled:opacity-50"
            >
              Berhenti di TU
            </button>
          </div>

          {remoteError && (
            <p role="status" className={`rounded-lg px-3 py-2 text-xs ${
              remoteError.startsWith('Perintah ')
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'bg-error-container text-on-error-container'
            }`}>
              {remoteError}
            </p>
          )}

          {!remoteOnline ? (
            <p className="text-xs text-on-surface-variant">
              Aktifkan <strong>Penerima Pengumuman Remote</strong> di komputer TU, pastikan online, lalu segarkan pustaka.
            </p>
          ) : remoteTracks.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Pustaka audio komputer TU masih kosong.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-primary/10 overflow-y-auto rounded-xl border border-primary/10 bg-white">
              {remoteTracks.map((track) => (
                <li key={track.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{track.title}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {track.category} · {track.duration}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoteAudioAction('play', track.id)}
                    disabled={remoteActionBusy}
                    aria-label={`Putar ${track.title} di Ruang TU`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Putar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Multi-Source Importer Dual Box */}
      <div className={`grid grid-cols-1 gap-space-lg ${isTauri() ? 'md:grid-cols-2' : ''}`}>
        {/* YouTube Importer */}
        {isTauri() && (
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Konverter Audio YouTube
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Ekstraksi audio .mp3 bersih via yt-dlp & ffmpeg
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Zero Ads
              </span>
            </div>

            <form onSubmit={handleYtDownload} className="mt-3 flex flex-col gap-2.5">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Tautan / URL Video YouTube:
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                    Judul Khusus (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Auto dari judul YouTube"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                    Kategori:
                  </label>
                  <select
                    value={ytCategory}
                    onChange={(e) => setYtCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Senam Pagi">Senam Pagi</option>
                    <option value="Upacara & Lagu Wajib">Upacara & Lagu Wajib</option>
                    <option value="Relaksasi">Relaksasi</option>
                    <option value="Nada Bel">Nada Bel</option>
                  </select>
                </div>
              </div>

              {downloadError && (
                <div className="text-[11px] text-error bg-error-container p-2 rounded-lg font-medium">
                  {downloadError}
                </div>
              )}

              <button
                type="submit"
                disabled={isDownloading || !ytUrl.trim()}
                className="mt-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary py-2.5 rounded-xl font-headline font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isDownloading ? 'Mengunduh & Mengekstrak Audio...' : 'Unduh & Simpan ke Pustaka Offline'}
                </span>
              </button>
            </form>
          </div>
          </div>
        )}

        {/* Local File Importer */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary-fixed" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Unggah File Audio Lokal
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Mendukung file .mp3, .wav, dan .m4a dari {isTauri() ? 'PC' : 'perangkat ini'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                Lokal Offline
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Kategori File yang Diunggah:
                </label>
                <select
                  value={localCategory}
                  onChange={(e) => setLocalCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Senam Pagi">Senam Pagi</option>
                  <option value="Upacara & Lagu Wajib">Upacara & Lagu Wajib</option>
                  <option value="Relaksasi">Relaksasi</option>
                  <option value="Nada Bel">Nada Bel</option>
                </select>
              </div>

              {/* Drag & Drop Area / File Input */}
              <button
                type="button"
                onClick={handleChooseLocalFile}
                disabled={isImportingLocal}
                className="w-full border-2 border-dashed border-outline-variant/60 hover:border-primary rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-surface-container-low/50 disabled:opacity-60"
              >
                <FileAudio className="w-7 h-7 text-primary" />
                <div className="text-center">
                  <span className="font-bold text-xs text-primary block">
                    {isImportingLocal
                      ? 'Mengimpor audio...'
                      : `Pilih File Audio dari ${isTauri() ? 'Komputer' : 'Perangkat Ini'}`}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Format MP3, WAV, M4A, atau OGG
                  </span>
                </div>
              </button>
              <input
                ref={localFileInput}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {localImportError && (
                <p role="alert" className="text-sm text-error bg-error-container p-2 rounded-lg">
                  {localImportError}
                </p>
              )}
              {!isTauri() && (
                <p className="text-[11px] text-on-surface-variant">
                  File disimpan di IndexedDB browser ini dan tetap tersedia setelah refresh. File tidak tersinkron ke perangkat lain atau Supabase; menghapus data situs browser dapat menghapusnya.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Playlist & Filter Section */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-base text-primary">
              Daftar Putar & Playlist Tersedia
            </h2>
            <span className="text-xs font-semibold text-on-surface-variant">
              ({filteredPlaylist.length} Lagu)
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Playlist Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-container text-on-surface-variant font-headline font-semibold">
                <th className="py-2.5 px-3">Judul Lagu / Media</th>
                <th className="py-2.5 px-3">Durasi</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Sumber</th>
                <th className="py-2.5 px-3">Ditambahkan</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredPlaylist.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    {isTauri()
                      ? 'Belum ada lagu dalam kategori ini. Silakan unggah atau unduh dari YouTube.'
                      : 'Belum ada lagu dalam kategori ini. Unggah file audio untuk mulai memutar lagu senam.'}
                  </td>
                </tr>
              ) : (
                filteredPlaylist.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <tr
                      key={track.id}
                      className={`hover:bg-surface-container-low transition-colors ${
                        isCurrent ? 'bg-primary-fixed/20 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => {
                              if (isCurrent) {
                                onTogglePlayMusic();
                              } else {
                                onSelectTrack(track);
                              }
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              isCurrent && isPlayingMusic
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container hover:bg-primary hover:text-white text-on-surface'
                            }`}
                          >
                            {isCurrent && isPlayingMusic ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-on-surface">
                              {track.title}
                            </span>
                            {isTauri() && (
                              <span className="text-[11px] text-on-surface-variant font-mono">
                                {track.file_path}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-primary">
                        {track.duration}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-semibold text-on-surface">
                          {track.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {track.source === 'youtube' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            <Video className="w-3 h-3" /> YouTube
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            <Upload className="w-3 h-3" /> File Lokal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant text-[11px]">
                        {track.date_added}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isTauri() && (
                            <button
                              onClick={() => onAddToSchedule(track)}
                              className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary hover:text-white transition-all text-xs font-semibold cursor-pointer"
                              title="Jadikan nada pemicu jadwal bel"
                            >
                              + Jadikan Bel
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTrack(track.id)}
                            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container flex items-center justify-center transition-all cursor-pointer"
                            title="Hapus dari Playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
