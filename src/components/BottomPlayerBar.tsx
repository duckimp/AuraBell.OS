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
import { getBrowserAudioId, getBrowserAudioUrl } from '../services/browserAudioStore';

interface BottomPlayerBarProps {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlaybackChange: (playing: boolean) => void;
  onPlaybackResult: (trackId: string, error?: string) => void;
  volume: number;
  duckPercent: number;
  stopSequence: number;
  onVolumeChange: (vol: number) => void;
}

export const BottomPlayerBar: React.FC<BottomPlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPlaybackChange,
  onPlaybackResult,
  volume,
  duckPercent,
  stopSequence,
  onVolumeChange,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progressSec, setProgressSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [loadedTrackId, setLoadedTrackId] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setLoadedTrackId(null);
    setPlaybackError(null);
    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setProgressSec(0);
      setDurationSec(0);
      setPlaybackError(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    const loadTrack = async () => {
      try {
        const path = currentTrack.file_path;
        const browserAudioId = getBrowserAudioId(path);
        const source = browserAudioId
          ? await getBrowserAudioUrl(browserAudioId)
          : isTauri() && (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path))
            ? convertFileSrc(path)
            : path;
        if (!active) {
          if (browserAudioId) URL.revokeObjectURL(source);
          return;
        }
        if (browserAudioId) objectUrl = source;
        audio.src = source;
        audio.load();
        objectUrlRef.current = objectUrl;
        setLoadedTrackId(currentTrack.id);
      } catch (error) {
        if (!active) return;
        console.error(`Gagal memutar audio "${currentTrack.title}"`, error);
        const message = error instanceof Error ? error.message : 'File audio tidak dapat diputar.';
        setPlaybackError(message);
        onPlaybackChange(false);
        onPlaybackResult(currentTrack.id, message);
      }
    };
    void loadTrack();

    return () => {
      active = false;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (objectUrlRef.current === objectUrl) objectUrlRef.current = null;
    };
  }, [currentTrack, onPlaybackChange, onPlaybackResult]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || loadedTrackId !== currentTrack.id) return;

    audio.loop = isLooping;
    audio.volume = (volume / 100) * (duckPercent / 100);
    if (isPlaying) {
      void audio.play().catch((error: unknown) => {
        console.error(`Gagal memutar audio "${currentTrack.title}"`, error);
        const message = error instanceof Error
          ? error.message
          : 'File audio tidak dapat diputar.';
        setPlaybackError(message);
        onPlaybackChange(false);
        onPlaybackResult(currentTrack.id, message);
      });
    } else {
      audio.pause();
    }
  }, [currentTrack, loadedTrackId, isPlaying, isLooping, volume, duckPercent, onPlaybackChange, onPlaybackResult]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = (volume / 100) * (duckPercent / 100);
    }
  }, [volume, duckPercent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setProgressSec(0);
    onPlaybackChange(false);
  }, [stopSequence, onPlaybackChange]);

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
    <div className="fixed bottom-0 left-72 max-[1100px]:left-20 max-[700px]:left-0 right-0 h-20 max-[700px]:h-14 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 shadow-lg z-40 px-gutter-desktop max-[1100px]:px-4 max-[700px]:px-2 flex items-center justify-between gap-3 max-[1100px]:gap-2 max-[700px]:gap-2 select-none">
      <div className="flex items-center gap-3 w-72 max-[1100px]:w-[30%] max-[700px]:w-[28%] min-w-0">
        <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shadow-sm shrink-0 max-[700px]:hidden">
          <Radio className={`w-6 h-6 text-primary-fixed ${isPlaying ? 'animate-pulse' : ''}`} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-headline font-bold text-sm text-on-surface truncate">
            {currentTrack ? currentTrack.title : 'Pilih lagu'}
          </span>
          <span className={`text-xs truncate max-[700px]:hidden ${playbackError ? 'text-error' : 'text-on-surface-variant'}`}>
            {playbackError || (currentTrack ? `${currentTrack.category} · ${currentTrack.source === 'youtube' ? 'YouTube' : 'Lokal'}` : 'Belum ada audio')}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col items-center gap-1.5 flex-1 max-w-xl px-4 max-[1100px]:px-1 max-[700px]:flex-row max-[700px]:justify-center max-[700px]:gap-2">
        <div className="flex items-center gap-4 max-[700px]:gap-2">
          <button onClick={() => seek(-10)} disabled={!currentTrack} title="Mundur 10 detik" className="text-on-surface-variant hover:text-primary disabled:opacity-40 max-[700px]:hidden">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Jeda audio' : 'Putar audio'}
            className="w-10 h-10 max-[700px]:w-9 max-[700px]:h-9 rounded-full bg-primary text-on-primary hover:bg-primary-container flex items-center justify-center shadow-sm disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button onClick={() => seek(10)} disabled={!currentTrack} title="Maju 10 detik" className="text-on-surface-variant hover:text-primary disabled:opacity-40 max-[700px]:hidden">
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLooping((looping) => !looping)}
            aria-label="Ulangi lagu"
            aria-pressed={isLooping}
            className={`max-[700px]:hidden ${isLooping ? 'text-primary' : 'text-outline-variant hover:text-on-surface-variant'}`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex items-center gap-2 max-[700px]:w-20 max-[700px]:shrink">
          <span className="text-xs font-mono text-on-surface-variant w-10 text-right max-[700px]:hidden">{formatSec(progressSec)}</span>
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
          <span className="text-xs font-mono text-on-surface-variant w-10 max-[700px]:hidden">{formatSec(durationSec)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-60 max-[1100px]:w-auto max-[700px]:w-auto justify-end">
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
          className="w-24 h-1.5 bg-surface-container rounded-lg accent-primary cursor-pointer max-[900px]:hidden"
        />
        <span className="text-sm font-mono font-bold text-primary w-10 max-[900px]:hidden">{volume}%</span>
      </div>

      <audio
        ref={audioRef}
        onPlaying={() => {
          if (currentTrack) onPlaybackResult(currentTrack.id);
        }}
        onTimeUpdate={(event) => setProgressSec(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDurationSec(event.currentTarget.duration || currentTrack?.duration_seconds || 0)}
        onEnded={() => onPlaybackChange(false)}
        onError={() => {
          if (currentTrack) {
            console.error(`File audio tidak dapat dibuka: ${currentTrack.file_path}`);
            setPlaybackError('File audio tidak ditemukan atau format tidak didukung.');
            onPlaybackResult(currentTrack.id, 'File audio tidak ditemukan atau format tidak didukung.');
          }
          onPlaybackChange(false);
        }}
        preload="metadata"
      />
    </div>
  );
};
