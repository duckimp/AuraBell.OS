import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Moon,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { AppData, HolidayEvent, ScheduleCategory } from '../types';

interface SpecialScheduleViewProps {
  appData: AppData;
  onUpdateHolidays: (holidays: HolidayEvent[]) => void;
  onSetActiveMode: (mode: ScheduleCategory) => void;
}

export const SpecialScheduleView: React.FC<SpecialScheduleViewProps> = ({
  appData,
  onUpdateHolidays,
  onSetActiveMode,
}) => {
  const [subTab, setSubTab] = useState<'kalender' | 'ramadan'>('kalender');

  // New Holiday form
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsOff, setNewIsOff] = useState(true);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTitle.trim()) return;

    const newH: HolidayEvent = {
      id: `hol-${Date.now()}`,
      date: newDate,
      title: newTitle,
      description: newDesc || 'Libur Nasional / Sekolah',
      is_school_off: newIsOff,
    };

    onUpdateHolidays([newH, ...appData.holidays]);
    setNewDate('');
    setNewTitle('');
    setNewDesc('');
  };

  const handleDeleteHoliday = (id: string) => {
    onUpdateHolidays(appData.holidays.filter((h) => h.id !== id));
  };

  const handleToggleHolidayOff = (id: string) => {
    onUpdateHolidays(
      appData.holidays.map((h) =>
        h.id === id ? { ...h, is_school_off: !h.is_school_off } : h
      )
    );
  };

  const isRamadanActive = appData.settings.active_mode === 'ramadan';

  return (
    <div className="flex flex-col gap-space-lg pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold uppercase tracking-wider">
              Jadwal Khusus & Kalender
            </span>
            <span className="text-on-surface-variant text-xs">
              • Kalender Libur & Konfigurasi Ramadan
            </span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight">
            Kalender Hari Libur & Mode Ramadan
          </h1>
          <p className="text-on-surface-variant text-sm">
            Saat hari libur tiba, sistem bel otomatis tidak akan berbunyi agar tidak mengganggu ketenangan sekolah di hari libur.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/30 w-fit">
        <button
          onClick={() => setSubTab('kalender')}
          className={`px-4 py-2 rounded-xl font-headline font-semibold text-xs transition-all cursor-pointer ${
            subTab === 'kalender'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <CalendarDays className="w-4 h-4 inline-block mr-1.5" />
          Kalender Libur Sekolah
        </button>
        <button
          onClick={() => setSubTab('ramadan')}
          className={`px-4 py-2 rounded-xl font-headline font-semibold text-xs transition-all cursor-pointer ${
            subTab === 'ramadan'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Moon className="w-4 h-4 inline-block mr-1.5" />
          Konfigurasi Mode Ramadan
        </button>
      </div>

      {subTab === 'kalender' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Add Holiday Form */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-surface-container mb-3">
                <Plus className="w-4 h-4 text-primary" />
                <h2 className="font-headline font-bold text-sm text-primary">
                  Tambah Hari Libur
                </h2>
              </div>

              <form onSubmit={handleAddHoliday} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-bold text-on-surface-variant block mb-1">
                    Tanggal Libur:
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-on-surface-variant block mb-1">
                    Nama Hari Libur / Keterangan:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hari Guru Nasional"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-on-surface-variant block mb-1">
                    Deskripsi / Catatan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Seluruh KBM ditiadakan"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                  <span className="font-bold text-on-surface">Nonaktifkan Bel Otomatis:</span>
                  <input
                    type="checkbox"
                    checked={newIsOff}
                    onChange={(e) => setNewIsOff(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 py-2.5 px-4 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-headline font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Simpan Hari Libur
                </button>
              </form>
            </div>
          </div>

          {/* Table of Holidays (2 cols) */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h2 className="font-headline font-bold text-base text-primary">
                Daftar Hari Libur Terjadwal
              </h2>
              <span className="text-xs font-semibold text-on-surface-variant">
                Total {appData.holidays.length} Hari
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-container text-on-surface-variant font-headline font-semibold">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Nama Hari Libur</th>
                    <th className="py-2.5 px-3">Catatan</th>
                    <th className="py-2.5 px-3 text-center">Bel Mati?</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {appData.holidays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                        Belum ada kalender hari libur terdaftar.
                      </td>
                    </tr>
                  ) : (
                    appData.holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-primary">
                          {h.date}
                        </td>
                        <td className="py-3 px-3 font-semibold text-on-surface">
                          {h.title}
                        </td>
                        <td className="py-3 px-3 text-on-surface-variant">
                          {h.description}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleHolidayOff(h.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              h.is_school_off
                                ? 'bg-red-100 text-red-800'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}
                          >
                            {h.is_school_off ? 'Ya (Bel Libur)' : 'Bel Tetap Aktif'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container flex items-center justify-center transition-all cursor-pointer ml-auto"
                            title="Hapus Hari Libur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      ) : (
        /* Ramadan Section */
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-900 to-primary text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-primary-fixed">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg">
                  Pengaturan Khusus Bulan Suci Ramadan
                </h3>
                <p className="text-sm text-primary-fixed">
                  Jam pelajaran dipersingkat 30-35 menit per sesi, bel kepulangan diajukan pukul 12:15 WIB.
                </p>
              </div>
            </div>

            <div>
              {isRamadanActive ? (
                <button
                  onClick={() => onSetActiveMode('reguler')}
                  className="flex items-center gap-2 bg-white text-primary hover:bg-primary-fixed px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4" /> Kembali ke Jadwal Reguler
                </button>
              ) : (
                <button
                  onClick={() => onSetActiveMode('ramadan')}
                  className="flex items-center gap-2 bg-white text-primary hover:bg-primary-fixed px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
                >
                  <Moon className="w-4 h-4" /> Aktifkan Mode Ramadan Sekarang
                </button>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-headline font-bold text-base text-primary mb-3">
              Daftar Jadwal Khusus Ramadan yang Terpasang:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {appData.schedules
                .filter((s) => s.category === 'ramadan')
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-lg text-primary block">
                        {item.time} WIB
                      </span>
                      <span className="font-bold text-sm text-on-surface block mt-0.5">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant font-mono mt-2 bg-surface-container px-2 py-0.5 rounded w-fit">
                      {item.audio_file}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
