import React, { useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat,
  Radio,
} from 'lucide-react';
import { AudioTrack } from '../types';
import { isTauri } from '../services/tauriBridge';

interface BottomPlayerBarProps {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlaybackChange: (playing: boolean) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const BottomPlayerBar: React.FC<BottomPlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPlaybackChange,
  volume,
  onVolumeChange,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progressSec, setProgressSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute('src');
      setProgressSec(0);
      setDurationSec(0);
      setPlaybackError(null);
      return;
    }

    setPlaybackError(null);
    const path = currentTrack.file_path;
    const source = isTauri() && (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path))
      ? convertFileSrc(path)
      : path;

    if (audio.getAttribute('src') !== source) {
      audio.src = source;
      audio.load();
    }
    audio.loop = isLooping;
    audio.volume = volume / 100;

    if (isPlaying) {
      void audio.play().catch((error: unknown) => {
        console.error(`Gagal memutar audio "${currentTrack.title}"`, error);
        setPlaybackError('File audio tidak dapat diputar.');
        onPlaybackChange(false);
      });
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying, isLooping, volume, onPlaybackChange]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const formatSec = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const seek = (offset: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + offset));
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(event.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setProgressSec(time);
  };

  const toggleMute = () => {
    const nextVolume = isMuted ? 85 : 0;
    setIsMuted(!isMuted);
    onVolumeChange(nextVolume);
  };

  return (
    <div className="fixed bottom-0 left-72 right-0 h-20 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 shadow-lg z-40 px-gutter-desktop flex items-center justify-between select-none">
      <div className="flex items-center gap-3 w-72 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shadow-sm shrink-0">
          <Radio className={`w-6 h-6 text-primary-fixed ${isPlaying ? 'animate-pulse' : ''}`} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-headline font-bold text-sm text-on-surface truncate">
            {currentTrack ? currentTrack.title : 'Pilih lagu'}
          </span>
          <span className={`text-xs truncate ${playbackError ? 'text-error' : 'text-on-surface-variant'}`}>
            {playbackError || (currentTrack ? `${currentTrack.category} · ${currentTrack.source === 'youtube' ? 'YouTube' : 'Lokal'}` : 'Belum ada audio')}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => seek(-10)} disabled={!currentTrack} title="Mundur 10 detik" className="text-on-surface-variant hover:text-primary disabled:opacity-40">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Jeda audio' : 'Putar audio'}
            className="w-10 h-10 rounded-full bg-primary text-on-primary hover:bg-primary-container flex items-center justify-center shadow-sm disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button onClick={() => seek(10)} disabled={!currentTrack} title="Maju 10 detik" className="text-on-surface-variant hover:text-primary disabled:opacity-40">
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLooping((looping) => !looping)}
            aria-label="Ulangi lagu"
            aria-pressed={isLooping}
            className={isLooping ? 'text-primary' : 'text-outline-variant hover:text-on-surface-variant'}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex items-center gap-2">
          <span className="text-xs font-mono text-on-surface-variant w-10 text-right">{formatSec(progressSec)}</span>
          <input
            type="range"
            min="0"
            max={durationSec || 0}
            value={Math.min(progressSec, durationSec || 0)}
            onChange={handleSeek}
            disabled={!durationSec}
            aria-label="Posisi audio"
            className="w-full h-1.5 bg-surface-container rounded-lg accent-primary cursor-pointer disabled:opacity-50"
          />
          <span className="text-xs font-mono text-on-surface-variant w-10">{formatSec(durationSec)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-60 justify-end">
        <button onClick={toggleMute} aria-label={isMuted || volume === 0 ? 'Nyalakan volume' : 'Bisukan audio'} className="text-on-surface-variant hover:text-primary">
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-error" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          aria-label="Volume audio"
          onChange={(event) => {
            setIsMuted(false);
            onVolumeChange(Number(event.target.value));
          }}
          className="w-24 h-1.5 bg-surface-container rounded-lg accent-primary cursor-pointer"
        />
        <span className="text-sm font-mono font-bold text-primary w-10">{volume}%</span>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(event) => setProgressSec(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDurationSec(event.currentTarget.duration || currentTrack?.duration_seconds || 0)}
        onEnded={() => onPlaybackChange(false)}
        onError={() => {
          if (currentTrack) {
            console.error(`File audio tidak dapat dibuka: ${currentTrack.file_path}`);
            setPlaybackError('File audio tidak ditemukan atau format tidak didukung.');
          }
          onPlaybackChange(false);
        }}
        preload="metadata"
      />
    </div>
  );
};
