import React, { useState, useMemo } from 'react';
import {
  Bell,
  Plus,
  Play,
  Pencil,
  Trash2,
  CheckCircle2,
  Download,
  Upload,
  Calendar,
  Volume2
} from 'lucide-react';
import { AppData, ScheduleCategory, ScheduleItem } from '../types';
import { audioEngine } from '../services/audioEngine';

interface ScheduleViewProps {
  appData: AppData;
  onUpdateSchedules: (schedules: ScheduleItem[]) => void;
  onSetActiveMode: (mode: ScheduleCategory) => void;
  onOpenAddModal: (itemToEdit?: ScheduleItem) => void;
  onTriggerBell: (title: string, audioFile: string, category?: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  appData,
  onUpdateSchedules,
  onSetActiveMode,
  onOpenAddModal,
  onTriggerBell,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ScheduleCategory>('reguler');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('Semua');

  const daysList = ['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Filter schedules by category and day
  const filteredSchedules = useMemo(() => {
    return appData.schedules
      .filter((s) => s.category === selectedCategory)
      .filter((s) => {
        if (selectedDayFilter === 'Semua') return true;
        return s.days.includes(selectedDayFilter);
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appData.schedules, selectedCategory, selectedDayFilter]);

  // Toggle active status
  const handleToggleActive = (id: string) => {
    const updated = appData.schedules.map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    );
    onUpdateSchedules(updated);
  };

  // Delete schedule
  const handleDelete = (id: string, title: string) => {
    if (confirm(`Yakin ingin menghapus jadwal "${title}"?`)) {
      const updated = appData.schedules.filter((s) => s.id !== id);
      onUpdateSchedules(updated);
    }
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData.schedules, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `aurabell_jadwal_${selectedCategory}.json`);
    dlAnchor.click();
  };

  const isCurrentCategoryActive = appData.settings.active_mode === selectedCategory;

  return (
    <div className="flex flex-col gap-space-lg pb-24">
      {/* Top Header Block */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold uppercase tracking-wider">
              Manajemen Jadwal Bel
            </span>
            <span className="text-on-surface-variant text-xs">
              • Database Terpusat Multi-Kondisi
            </span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight">
            Konfigurasi & Pengaturan Jadwal Bel
          </h1>
          <p className="text-on-surface-variant text-sm">
            Atur jam bel masuk, istirahat, pergantian jam pelajaran, dan kepulangan sekolah sesuai skema operasional.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-secondary" />
            <span>Ekspor JSON</span>
          </button>
          <button
            onClick={() => onOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal Baru</span>
          </button>
        </div>
      </div>

      {/* Category Tabs: Reguler, Ujian, Ramadan */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'reguler', label: 'Jadwal Reguler (Senin - Jumat)' },
              { id: 'ujian', label: 'Jadwal Ujian (Mode Khusus)' },
              { id: 'ramadan', label: 'Jadwal Bulan Ramadan' },
            ] as { id: ScheduleCategory; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-4 py-2 rounded-xl font-headline font-semibold text-xs transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Set Active Mode Switch */}
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[11px] text-on-surface-variant font-medium">
              Status Skema:
            </span>
            <span className="text-xs font-bold text-on-surface">
              {isCurrentCategoryActive ? 'SEDANG DIGUNAKAN (AKTIF)' : 'TIDAK DIGUNAKAN'}
            </span>
          </div>

          {!isCurrentCategoryActive ? (
            <button
              onClick={() => onSetActiveMode(selectedCategory)}
              className="px-3 py-1.5 rounded-lg bg-primary-fixed text-on-primary-fixed hover:bg-primary font-bold text-xs transition-all cursor-pointer"
            >
              Jadikan Skema Utama
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              <CheckCircle2 className="w-4 h-4" /> Terpasang
            </span>
          )}
        </div>
      </div>

      {/* Day Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-on-surface-variant pr-2 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Filter Hari:
        </span>
        {daysList.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDayFilter(day)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedDayFilter === day
                ? 'bg-secondary text-white'
                : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Main Schedule Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <span className="text-xs font-semibold text-on-surface-variant">
            Menampilkan {filteredSchedules.length} entri jadwal untuk mode{' '}
            <strong className="capitalize text-primary">{selectedCategory}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-container text-on-surface-variant font-headline font-semibold">
                <th className="py-3 px-3 w-24">Waktu</th>
                <th className="py-3 px-3">Keterangan Bel / Sesi</th>
                <th className="py-3 px-3">Hari Berlaku</th>
                <th className="py-3 px-3">File Audio / Trigger</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant text-sm">
                    Belum ada jadwal untuk kategori atau hari ini. Silakan klik "Tambah Jadwal Baru".
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      !item.active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-base text-primary">
                      {item.time} <span className="text-[10px] text-on-surface-variant font-normal">WIB</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-on-surface">{item.title}</span>
                        {item.tts_text && (
                          <span className="text-[11px] text-on-surface-variant italic mt-0.5">
                            Pesan Suara: "{item.tts_text}"
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {item.days.map((d) => (
                          <span
                            key={d}
                            className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-semibold text-on-surface"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] bg-surface-container-low px-2 py-1 rounded border border-outline-variant/30 text-on-surface">
                          {item.audio_file}
                        </span>
                        <button
                          onClick={() => onTriggerBell(item.title, item.audio_file, item.category)}
                          title="Pratinjau Suara Bel"
                          className="w-7 h-7 rounded-lg bg-surface-container hover:bg-primary hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          item.active
                            ? 'bg-primary-fixed text-on-primary-fixed hover:bg-emerald-200'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {item.active ? 'Aktif' : 'Non-aktif'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenAddModal(item)}
                          className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                          title="Edit Jadwal"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="w-8 h-8 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

