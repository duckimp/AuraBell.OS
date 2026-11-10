import React, { useEffect, useRef, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Download, GraduationCap, RotateCcw, Save, Upload, Volume2 } from 'lucide-react';
import { AppData } from '../types';
import { isTauri, tauriBridge } from '../services/tauriBridge';
import {
  REMOTE_RECEIVER_STORAGE_KEY,
  RemoteReceiverStatus,
} from '../services/remoteAnnouncements';

interface SettingsViewProps {
  appData: AppData;
  onSaveSchoolSettings: (schoolName: string, academicYear: string) => Promise<void>;
  onMusicDuckPercentChange: (percent: number) => Promise<void>;
  onRestoreBackup: (data: AppData) => Promise<void>;
  remoteReceiverEnabled: boolean;
  remoteReceiverStatus: RemoteReceiverStatus;
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AppData>;
  return Boolean(
    data.settings &&
      typeof data.settings.school_name === 'string' &&
      typeof data.settings.academic_year === 'string' &&
      Array.isArray(data.schedules) &&
      Array.isArray(data.playlist) &&
      Array.isArray(data.tts_history) &&
      Array.isArray(data.holidays)
  );
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appData,
  onSaveSchoolSettings,
  onMusicDuckPercentChange,
  onRestoreBackup,
  remoteReceiverEnabled,
  remoteReceiverStatus,
}) => {
  const [schoolName, setSchoolName] = useState(appData.settings.school_name);
  const [academicYear, setAcademicYear] = useState(appData.settings.academic_year);
  const [musicDuckPercent, setMusicDuckPercent] = useState(appData.settings.music_duck_percent ?? 20);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const browserImportRef = useRef<HTMLInputElement>(null);

  const handleRemoteReceiverChange = (enabled: boolean) => {
    localStorage.setItem(REMOTE_RECEIVER_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event('aurabell-remote-receiver-config-changed'));
  };
  const receiverStatusText: Record<RemoteReceiverStatus, string> = {
    disabled: 'Penerima nonaktif di perangkat ini.',
    connecting: 'Menghubungkan ke Supabase...',
    connected: 'Terhubung—siap menerima pengumuman.',
    error: 'Koneksi gagal. Periksa internet dan konfigurasi Supabase.',
  };

  useEffect(() => {
    setSchoolName(appData.settings.school_name);
    setAcademicYear(appData.settings.academic_year);
    setMusicDuckPercent(appData.settings.music_duck_percent ?? 20);
  }, [appData.settings.school_name, appData.settings.academic_year, appData.settings.music_duck_percent]);

  const handleSaveMusicDuckPercent = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await onMusicDuckPercentChange(musicDuckPercent);
      setStatus({ kind: 'success', message: 'Prioritas volume bel berhasil disimpan.' });
    } catch (error) {
      setStatus({ kind: 'error', message: `Gagal menyimpan volume prioritas bel: ${String(error)}` });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolName.trim()) {
      setStatus({ kind: 'error', message: 'Nama sekolah harus diisi.' });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      await onSaveSchoolSettings(schoolName.trim(), academicYear.trim());
      setStatus({ kind: 'success', message: 'Pengaturan sekolah berhasil disimpan.' });
    } catch (error) {
      setStatus({ kind: 'error', message: `Gagal menyimpan pengaturan: ${String(error)}` });
    } finally {
      setBusy(false);
    }
  };

  const handleExportBackup = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (isTauri()) {
        const path = await save({
          title: 'Simpan backup AuraBell.OS',
          defaultPath: 'aurabell-backup.zip',
          filters: [{ name: 'Backup AuraBell.OS', extensions: ['zip'] }],
        });
        if (!path) return;
        await tauriBridge.exportAppBackup(path);
      } else {
        const backup = {
          format: 'AuraBell.OS backup',
          format_version: 1,
          data: appData,
        };
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = 'aurabell-backup.json';
        link.click();
        URL.revokeObjectURL(url);
      }
      setStatus({
        kind: 'success',
        message: 'Backup berhasil dibuat. Simpan file ini di tempat yang aman.',
      });
    } catch (error) {
      setStatus({ kind: 'error', message: `Gagal membuat backup: ${String(error)}` });
    } finally {
      setBusy(false);
    }
  };

  const applyBackup = async (data: AppData) => {
    if (!window.confirm('Pulihkan backup? Data AuraBell.OS yang sekarang akan diganti.')) return;
    await onRestoreBackup(data);
    setStatus({ kind: 'success', message: 'Backup berhasil dipulihkan.' });
  };

  const handleRestoreBackup = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (isTauri()) {
        const path = await open({
          title: 'Pilih backup AuraBell.OS',
          multiple: false,
          filters: [{ name: 'Backup AuraBell.OS', extensions: ['zip'] }],
        });
        if (typeof path !== 'string') return;
        const restoredData = await tauriBridge.restoreAppBackup(path);
        await applyBackup(restoredData);
      } else {
        browserImportRef.current?.click();
      }
    } catch (error) {
      setStatus({ kind: 'error', message: `Gagal memulihkan backup: ${String(error)}` });
    } finally {
      setBusy(false);
    }
  };

  const handleBrowserBackupFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const backup = JSON.parse(await file.text()) as { data?: unknown };
      if (!isAppData(backup.data)) {
        throw new Error('Struktur file backup tidak valid.');
      }
      await applyBackup(backup.data);
    } catch (error) {
      setStatus({ kind: 'error', message: `Gagal memulihkan backup: ${String(error)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-lg pb-24">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Konfigurasi</span>
        <h1 className="mt-1 font-headline text-2xl font-extrabold text-primary">Pengaturan Sekolah</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Atur identitas sekolah dan pindahkan konfigurasi AuraBell.OS dengan backup.
        </p>
      </div>

      <form
        onSubmit={handleSaveSchool}
        className="flex flex-col gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-sm"
      >
        <div className="flex items-center gap-2 border-b border-surface-container pb-3">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="font-headline text-base font-bold text-primary">Identitas Sekolah</h2>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Nama sekolah
          <input
            value={schoolName}
            onChange={(event) => setSchoolName(event.target.value)}
            maxLength={120}
            required
            className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Tahun ajaran
          <input
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            maxLength={80}
            className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Simpan Pengaturan
        </button>
      </form>

      <section className="flex flex-col gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center gap-2 border-b border-surface-container pb-3">
          <Volume2 className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-headline text-base font-bold text-primary">Prioritas Bel di Atas Musik</h2>
            <p className="text-sm text-on-surface-variant">
              Saat bel atau audio pengumuman berjalan, musik tetap diputar lebih pelan lalu kembali ke volume semula.
            </p>
          </div>
        </div>
        <label htmlFor="music-duck-percent" className="flex items-center justify-between gap-4 text-sm font-semibold text-on-surface-variant">
          Volume musik saat bel berbunyi
          <span className="font-mono font-bold text-primary">{musicDuckPercent}%</span>
        </label>
        <input
          id="music-duck-percent"
          type="range"
          min="0"
          max="100"
          step="5"
          value={musicDuckPercent}
          onChange={(event) => setMusicDuckPercent(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-primary"
        />
        <p className="text-xs text-on-surface-variant">
          Persentase dari volume musik saat ini. Contoh: musik 80% dan prioritas 20% menghasilkan volume sementara 16%. Berlaku untuk bel manual, jadwal otomatis, dan darurat.
        </p>
        <button
          type="button"
          onClick={() => void handleSaveMusicDuckPercent()}
          disabled={busy || musicDuckPercent === (appData.settings.music_duck_percent ?? 20)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Simpan Prioritas Bel
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-base font-bold text-primary">Penerima Pengumuman Remote</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Perangkat ini (Ruang TU) menerima pengumuman dari akun sekolah. Jadwal bel otomatis tetap berjalan lokal di aplikasi desktop.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={remoteReceiverEnabled}
            onClick={() => handleRemoteReceiverChange(!remoteReceiverEnabled)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${
              remoteReceiverEnabled
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {remoteReceiverEnabled ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>
        <p className="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
          Perangkat tujuan: <strong>ruang-tu</strong>. Browser/PWA dapat memakai voice browser yang tersedia—gunakan Chrome di komputer TU bila Google Bahasa Indonesia terdeteksi. Halaman/browser harus tetap terbuka. Jika Tauri dan browser sama-sama aktif sebagai receiver, salah satunya akan menerima tiap perintah.
        </p>
        <p role="status" className={`text-xs font-semibold ${
          remoteReceiverStatus === 'connected'
            ? 'text-primary'
            : remoteReceiverStatus === 'error'
              ? 'text-error'
              : 'text-on-surface-variant'
        }`}>
          {receiverStatusText[remoteReceiverStatus]}
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center gap-2 border-b border-surface-container pb-3">
          <RotateCcw className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-headline text-base font-bold text-primary">Backup & Restore</h2>
            <p className="text-sm text-on-surface-variant">
              Simpan jadwal, pengaturan, playlist, riwayat, dan data sekolah untuk dipindahkan ke perangkat lain.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleExportBackup()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Buat Backup
          </button>
          <button
            type="button"
            onClick={() => void handleRestoreBackup()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Pulihkan Backup
          </button>
          <input
            ref={browserImportRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleBrowserBackupFile(event)}
            className="hidden"
          />
        </div>
        <p className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
          {isTauri()
            ? 'Backup desktop berupa file ZIP yang menyertakan audio lokal. Restore akan mengganti data saat ini.'
            : 'Backup browser berupa JSON dan tidak menyertakan berkas audio IndexedDB. Audio tetap ada setelah refresh di browser/origin yang sama, tetapi tidak tersinkron antarperangkat; menghapus data situs dapat menghapusnya.'}
        </p>
        {status && (
          <p
            role={status.kind === 'error' ? 'alert' : 'status'}
            className={`rounded-xl p-3 text-sm font-medium ${
              status.kind === 'error'
                ? 'bg-error-container text-on-error-container'
                : 'bg-primary-fixed/40 text-primary'
            }`}
          >
            {status.message}
          </p>
        )}
      </section>
    </div>
  );
};
