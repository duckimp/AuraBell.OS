import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { X, Clock, Bell, Save, Upload } from 'lucide-react';
import { AppData, AudioTrack, ScheduleCategory, ScheduleItem } from '../types';
import { isTauri } from '../services/tauriBridge';

const BUILT_IN_AUDIO_FILES = [
  'bel_masuk_3_nada.mp3',
  'westminster_chime.mp3',
  'bel_istirahat.mp3',
  'bel_pulang.mp3',
];

interface ModalAddScheduleProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ScheduleItem) => void;
  onImportAudio: (file: File | string) => Promise<AudioTrack>;
  itemToEdit?: ScheduleItem | null;
  appData: AppData;
}

export const ModalAddSchedule: React.FC<ModalAddScheduleProps> = ({
  isOpen,
  onClose,
  onSave,
  onImportAudio,
  itemToEdit,
  appData,
}) => {
  const [time, setTime] = useState('07:00');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ScheduleCategory>('reguler');
  const [days, setDays] = useState<string[]>(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const [audioFile, setAudioFile] = useState('bel_masuk_3_nada.mp3');
  const [audioType, setAudioType] = useState<ScheduleItem['audio_type']>('standard');
  const [ttsText, setTtsText] = useState('');
  const [active, setActive] = useState(true);
  const [isImportingAudio, setIsImportingAudio] = useState(false);
  const [audioImportError, setAudioImportError] = useState<string | null>(null);

  const daysAvailable = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  useEffect(() => {
    if (itemToEdit) {
      setTime(itemToEdit.time);
      setTitle(itemToEdit.title);
      setCategory(itemToEdit.category);
      setDays(itemToEdit.days);
      setAudioFile(itemToEdit.audio_file);
      setAudioType(
        itemToEdit.audio_type === 'tts' && itemToEdit.audio_file
          ? BUILT_IN_AUDIO_FILES.includes(itemToEdit.audio_file)
            ? 'standard'
            : 'custom'
          : itemToEdit.audio_type
      );
      setTtsText(itemToEdit.tts_text || '');
      setActive(itemToEdit.active);
    } else {
      setTime('07:00');
      setTitle('');
      setCategory('reguler');
      setDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
      setAudioFile('bel_masuk_3_nada.mp3');
      setAudioType('standard');
      setTtsText('');
      setActive(true);
    }
    setAudioImportError(null);
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (days.includes(day)) {
      if (days.length > 1) {
        setDays(days.filter((d) => d !== day));
      }
    } else {
      setDays([...days, day]);
    }
  };

  const handleSelectAllDays = () => {
    setDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  };

  const importAudio = async (file: File | string) => {
    setAudioImportError(null);
    setIsImportingAudio(true);
    try {
      const track = await onImportAudio(file);
      setAudioFile(track.file_path);
      setAudioType('custom');
    } catch (error) {
      setAudioImportError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsImportingAudio(false);
    }
  };

  const handleChooseAudio = async () => {
    if (!isTauri()) {
      setAudioImportError('Agar file tetap tersedia setelah aplikasi dibuka kembali, impor audio melalui aplikasi desktop.');
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'File audio', extensions: ['mp3', 'wav', 'm4a', 'ogg'] }],
      });
      if (typeof selected === 'string') await importAudio(selected);
    } catch (error) {
      setAudioImportError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleAudioTypeChange = (nextType: ScheduleItem['audio_type']) => {
    setAudioType(nextType);
    if (nextType === 'standard' && !BUILT_IN_AUDIO_FILES.includes(audioFile)) {
      setAudioFile('bel_masuk_3_nada.mp3');
    } else if (nextType === 'custom' && BUILT_IN_AUDIO_FILES.includes(audioFile)) {
      setAudioFile('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Keterangan bel harus diisi.');
      return;
    }
    if (audioType === 'tts' && !ttsText.trim()) {
      alert('Teks pengumuman TTS harus diisi.');
      return;
    }
    if (audioType === 'custom' && !audioFile) {
      alert('Pilih atau impor file audio terlebih dahulu.');
      return;
    }

    const newItem: ScheduleItem = {
      id: itemToEdit ? itemToEdit.id : `sch-${Date.now()}`,
      time,
      title,
      category,
      days,
      audio_file: audioType === 'tts' ? '' : audioFile,
      audio_type: audioType,
      tts_text: ttsText.trim() ? ttsText.trim() : undefined,
      active,
    };

    onSave(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl rounded-3xl bg-surface-container-lowest text-on-surface p-space-lg shadow-2xl border border-outline-variant/30 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-fixed" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-primary">
                {itemToEdit ? 'Edit Jadwal Bel' : 'Tambah Jadwal Bel Baru'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                Daftarkan waktu pemicu dan berkas audio yang sesuai
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 text-xs">
          {/* Jam & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-on-surface-variant block mb-1">
                Waktu Berbunyi (Jam:Menit WIB):
              </label>
              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/40">
                <Clock className="w-4 h-4 text-primary" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-transparent font-mono font-bold text-base text-primary w-full focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-on-surface-variant block mb-1">
                Kategori Skema Jadwal:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ScheduleCategory)}
                className="w-full px-3 py-2.5 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="reguler">Jadwal Reguler (Senin - Jumat)</option>
                <option value="ujian">Jadwal Ujian (Waktu Khusus)</option>
                <option value="ramadan">Jadwal Bulan Ramadan</option>
              </select>
            </div>
          </div>

          {/* Keterangan Bel */}
          <div>
            <label className="font-bold text-on-surface-variant block mb-1">
              Keterangan Sesi / Nama Bel:
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Bel Masuk Jam Ke-1, Istirahat 1, Pulang"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Multi-select Days */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-on-surface-variant">
                Hari Berlaku:
              </label>
              <button
                type="button"
                onClick={handleSelectAllDays}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Senin - Jumat
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {daysAvailable.map((d) => {
                const isSelected = days.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pilihan Suara Bel */}
          <div>
            <label className="font-bold text-on-surface-variant block mb-1">
              Sumber Suara:
            </label>
            <select
              value={audioType}
              onChange={(e) => handleAudioTypeChange(e.target.value as ScheduleItem['audio_type'])}
              className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="standard">Nada bel bawaan</option>
              <option value="custom">File audio tersimpan</option>
              <option value="tts">Pengumuman TTS</option>
            </select>

            {audioType === 'standard' && (
              <select
                value={audioFile}
                onChange={(e) => setAudioFile(e.target.value)}
                aria-label="Pilih nada bel bawaan"
                className="w-full mt-2 px-3 py-2 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="bel_masuk_3_nada.mp3">Bel Masuk 3-Nada</option>
                <option value="westminster_chime.mp3">Westminster Quarters</option>
                <option value="bel_istirahat.mp3">Bel Istirahat</option>
                <option value="bel_pulang.mp3">Bel Kepulangan</option>
              </select>
            )}

            {audioType === 'custom' && (
              <>
                <select
                  value={audioFile}
                  onChange={(e) => setAudioFile(e.target.value)}
                  aria-label="Pilih file audio tersimpan"
                  className="w-full mt-2 px-3 py-2 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Pilih audio dari pustaka...</option>
                  {audioFile && !appData.playlist.some((track) => track.file_path === audioFile) && (
                    <option value={audioFile}>Audio yang dipilih untuk jadwal ini</option>
                  )}
                  {appData.playlist.map((tr) => (
                    <option key={tr.id} value={tr.file_path}>
                      {tr.title} ({tr.duration})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleChooseAudio()}
                  disabled={isImportingAudio}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-container text-primary font-semibold disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isImportingAudio ? 'Mengimpor audio...' : 'Impor file untuk bel ini'}
                </button>
                {audioImportError && (
                  <p role="alert" className="mt-2 text-sm text-error">{audioImportError}</p>
                )}
              </>
            )}
          </div>

          {/* TTS announcement */}
          <div>
            <label className="font-bold text-on-surface-variant block mb-1">
              {audioType === 'tts' ? 'Teks Pengumuman TTS:' : 'Teks TTS setelah bunyi (Opsional):'}
            </label>
            <textarea
              required={audioType === 'tts'}
              rows={2}
              placeholder="Contoh: Pintu gerbang ditutup, pelajaran jam pertama segera dimulai."
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">
              {audioType === 'tts'
                ? 'Jadwal ini akan membacakan teks tanpa nada bel.'
                : 'Jika diisi, teks dibacakan setelah audio bel selesai.'}
            </span>
          </div>

          {/* Status Aktif */}
          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <span className="font-bold text-on-surface">Status Jadwal Aktif:</span>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                active ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {active ? 'Aktif' : 'Non-aktif'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Jadwal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
