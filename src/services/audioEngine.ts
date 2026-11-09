// Audio Engine: Web Audio bells, offline Piper TTS, and browser Web Speech fallback
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauriBridge';

export type VoiceGender = 'female' | 'male';

const FEMALE_VOICE_NAMES = /female|woman|girl|gadis|zira|siti|amelia|putri|ayu/i;
const MALE_VOICE_NAMES = /\bmale\b|\bman\b|\bboy\b|ardi|dimas|budi|andika|joko/i;

export function getIndonesianVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter((voice) =>
    voice.lang.toLowerCase().startsWith('id')
  );
}

export function findIndonesianVoice(gender: VoiceGender): SpeechSynthesisVoice | undefined {
  const voices = getIndonesianVoices();
  const genderPattern = gender === 'female' ? FEMALE_VOICE_NAMES : MALE_VOICE_NAMES;
  return voices.find((voice) => genderPattern.test(voice.name));
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bellOscillators = new Set<OscillatorNode>();
  private isEmergencyPlaying = false;
  private emergencyOscillator: OscillatorNode | null = null;
  private emergencyGain: GainNode | null = null;
  private currentVolume = 0.85;
  private currentBellAudio: HTMLAudioElement | null = null;
  private currentSpeechSource: AudioBufferSourceNode | null = null;
  private currentSpeechGain: GainNode | null = null;
  private currentSpeechVolume = 1;
  private speechRequestId = 0;
  private speechTimer: ReturnType<typeof setTimeout> | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol / 100));
    if (this.currentBellAudio) this.currentBellAudio.volume = this.currentVolume;
    if (this.currentSpeechGain && this.ctx) {
      this.currentSpeechGain.gain.setValueAtTime(
        this.currentSpeechVolume * this.currentVolume,
        this.ctx.currentTime
      );
    }
  }

  // Play a tubular bell chime tone
  private playBellNote(frequency: number, startTime: number, duration: number, volume = 0.4) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    // Tubular bell harmonic overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 2.76, startTime);

    gain.gain.setValueAtTime(volume * this.currentVolume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    gain2.gain.setValueAtTime(volume * 0.3 * this.currentVolume, startTime);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + duration);
    osc2.stop(startTime + duration);
    this.bellOscillators.add(osc);
    this.bellOscillators.add(osc2);
    osc.onended = () => this.bellOscillators.delete(osc);
    osc2.onended = () => this.bellOscillators.delete(osc2);
  }

  // 1. Westminster Quarters Chime (Classic School Bell)
  public playWestminster(onFinish?: () => void) {
    const ctx = this.getContext();
    const now = ctx.currentTime + 0.1;

    // Frequencies: G#4 (415), F#4 (370), E4 (330), B3 (247)
    const notes = [
      { f: 415.3, t: 0.0, d: 0.8 },
      { f: 370.0, t: 0.7, d: 0.8 },
      { f: 329.6, t: 1.4, d: 0.8 },
      { f: 246.9, t: 2.1, d: 1.6 },
    ];

    notes.forEach((n) => {
      this.playBellNote(n.f, now + n.t, n.d, 0.45);
    });

    if (onFinish) {
      setTimeout(onFinish, 4000);
    }
  }

  // 2. Bel Masuk 3-Nada (Do - Mi - Sol)
  public playThreeToneChime(onFinish?: () => void) {
    const ctx = this.getContext();
    const now = ctx.currentTime + 0.05;

    // C5 (523.25), E5 (659.25), G5 (783.99)
    const notes = [
      { f: 523.25, t: 0.0, d: 0.9 },
      { f: 659.25, t: 0.6, d: 0.9 },
      { f: 783.99, t: 1.2, d: 1.8 },
    ];

    notes.forEach((n) => {
      this.playBellNote(n.f, now + n.t, n.d, 0.5);
    });

    if (onFinish) {
      setTimeout(onFinish, 3200);
    }
  }

  // 3. Bank / Hospital Counter Chime (Ting-Tung 2 Nada: Sol -> Do)
  public playBankChime(onFinish?: () => void) {
    const ctx = this.getContext();
    const now = ctx.currentTime + 0.05;

    // G4 (392.00) -> C5 (523.25)
    this.playBellNote(392.0, now, 0.7, 0.5);
    this.playBellNote(523.25, now + 0.5, 1.4, 0.6);

    if (onFinish) {
      setTimeout(onFinish, 2000);
    }
  }

  // 4. Airport 3-Ding Chime (Mi -> Do -> Sol)
  public playAirportChime(onFinish?: () => void) {
    const ctx = this.getContext();
    const now = ctx.currentTime + 0.05;

    this.playBellNote(659.25, now, 0.6, 0.45);
    this.playBellNote(523.25, now + 0.4, 0.6, 0.45);
    this.playBellNote(783.99, now + 0.8, 1.5, 0.55);

    if (onFinish) {
      setTimeout(onFinish, 2400);
    }
  }

  // 5. Emergency Siren (Continuous Warning)
  public startEmergencySiren() {
    if (this.isEmergencyPlaying) return;
    this.isEmergencyPlaying = true;

    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.3 * this.currentVolume, ctx.currentTime);

    // LFO for wailing pitch
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, ctx.currentTime); // 0.5 Hz cycle

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(300, ctx.currentTime); // modulate +-300Hz

    osc.frequency.setValueAtTime(800, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    lfo.start();

    this.emergencyOscillator = osc;
    this.emergencyGain = gain;
  }

  public stopEmergencySiren() {
    this.isEmergencyPlaying = false;
    if (this.emergencyOscillator) {
      try {
        this.emergencyOscillator.stop();
        this.emergencyOscillator.disconnect();
      } catch (e) {
        console.error(e);
      }
      this.emergencyOscillator = null;
    }
    if (this.emergencyGain) {
      try {
        this.emergencyGain.disconnect();
      } catch (e) {
        console.error(e);
      }
      this.emergencyGain = null;
    }
  }

  private isPlayableFilePath(filename: string): boolean {
    return filename.startsWith('/') ||
      /^[a-zA-Z]:[\\/]/.test(filename) ||
      filename.startsWith('blob:') ||
      filename.startsWith('data:') ||
      filename.startsWith('asset:');
  }

  private resolveAudioSource(filename: string): string {
    return isTauri() && (filename.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(filename))
      ? convertFileSrc(filename)
      : filename;
  }

  // Play a stored audio file when available, otherwise use the built-in bell tone.
  public playSoundFile(filename: string, onFinish?: () => void) {
    if (this.isPlayableFilePath(filename)) {
      this.stopBellAudio();
      const audio = new Audio(this.resolveAudioSource(filename));
      audio.volume = this.currentVolume;
      audio.onended = () => {
        if (this.currentBellAudio === audio) this.currentBellAudio = null;
        onFinish?.();
      };
      audio.onerror = () => {
        console.error(`Gagal memutar file audio: ${filename}`);
        if (this.currentBellAudio === audio) this.currentBellAudio = null;
      };
      this.currentBellAudio = audio;
      void audio.play().catch((error: unknown) => {
        console.error(`Gagal memutar file audio: ${filename}`, error);
      });
      return;
    }

    if (filename.includes('3_nada') || filename.includes('masuk')) {
      this.playThreeToneChime(onFinish);
    } else if (filename.includes('istirahat')) {
      this.playAirportChime(onFinish);
    } else if (filename.includes('pulang')) {
      this.playThreeToneChime(onFinish);
    } else {
      this.playWestminster(onFinish);
    }
  }

  public stopBellAudio() {
    if (this.currentBellAudio) {
      this.currentBellAudio.pause();
      this.currentBellAudio.currentTime = 0;
      this.currentBellAudio.src = '';
      this.currentBellAudio = null;
    }
    for (const oscillator of this.bellOscillators) {
      oscillator.stop();
    }
    this.bellOscillators.clear();
  }

  private speakWithWebSpeech(
    text: string,
    requestId: number,
    options: {
      pitch: number;
      rate: number;
      volume: number;
      gender?: VoiceGender;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (message: string) => void;
    }
  ) {
    if (!('speechSynthesis' in window)) {
      options.onError?.('Browser / WebView ini tidak mendukung Text-to-Speech Web API.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.pitch = options.pitch;
    utterance.rate = options.rate;
    utterance.volume = options.volume * this.currentVolume;

    const voices = getIndonesianVoices();
    const selectedVoice = options.gender ? findIndonesianVoice(options.gender) : voices[0];
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else if (voices.length > 0) {
      utterance.voice = voices[0];
    }
    if (options.gender && !findIndonesianVoice(options.gender)) {
      utterance.pitch = options.gender === 'female'
        ? Math.max(options.pitch, 1.15)
        : Math.min(options.pitch, 0.9);
    }

    utterance.onstart = () => {
      if (requestId === this.speechRequestId) options.onStart?.();
    };
    utterance.onend = () => {
      if (requestId === this.speechRequestId) options.onEnd?.();
    };
    utterance.onerror = (event) => {
      if (requestId === this.speechRequestId) {
        options.onError?.(`Text-to-Speech gagal: ${event.error}`);
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  private async speakWithPiper(
    text: string,
    requestId: number,
    volume: number,
    rate: number,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (message: string) => void
  ) {
    let source: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    let settled = false;

    const release = () => {
      if (source && this.currentSpeechSource === source) {
        this.currentSpeechSource = null;
        this.currentSpeechGain = null;
      }
      source?.disconnect();
      gain?.disconnect();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      source?.stop();
      release();
      if (requestId === this.speechRequestId) onError?.(message);
    };

    try {
      const audioBytes = await invoke<number[]>('synthesize_offline_tts', { text, rate });
      if (requestId !== this.speechRequestId) return;

      const context = this.getContext();
      const audioBuffer = await context.decodeAudioData(Uint8Array.from(audioBytes).buffer);
      if (requestId !== this.speechRequestId) return;

      source = context.createBufferSource();
      gain = context.createGain();
      source.buffer = audioBuffer;
      gain.gain.setValueAtTime(volume * this.currentVolume, context.currentTime);
      source.connect(gain);
      gain.connect(context.destination);
      this.currentSpeechVolume = volume;
      this.currentSpeechSource = source;
      this.currentSpeechGain = gain;

      source.onended = () => {
        if (settled) return;
        settled = true;
        release();
        if (requestId === this.speechRequestId) onEnd?.();
      };
      source.start();
      onStart?.();
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }

  // Use Piper offline in Tauri; browser previews continue to use Web Speech.
  public speakIndonesian(
    text: string,
    options: {
      pitch?: number;
      rate?: number;
      volume?: number;
      gender?: VoiceGender;
      chime?: 'bank' | 'airport' | 'dingdong' | 'none';
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (message: string) => void;
    } = {}
  ) {
    const {
      pitch = 1.0,
      rate = 0.95,
      volume = 1.0,
      gender,
      chime = 'bank',
      onStart,
      onEnd,
      onError,
    } = options;

    this.stopSpeaking();
    const requestId = this.speechRequestId;
    this.currentSpeechVolume = volume;

    const executeSpeech = () => {
      if (requestId !== this.speechRequestId) return;
      const speechOptions = { pitch, rate, volume, gender, onStart, onEnd, onError };
      if (isTauri()) {
        void this.speakWithPiper(text, requestId, volume, rate, onStart, onEnd, onError);
      } else {
        this.speakWithWebSpeech(text, requestId, speechOptions);
      }
    };

    if (chime === 'bank') {
      this.playBankChime(() => {
        this.speechTimer = setTimeout(executeSpeech, 250);
      });
    } else if (chime === 'airport') {
      this.playAirportChime(() => {
        this.speechTimer = setTimeout(executeSpeech, 250);
      });
    } else if (chime === 'dingdong') {
      this.playThreeToneChime(() => {
        this.speechTimer = setTimeout(executeSpeech, 250);
      });
    } else {
      executeSpeech();
    }
  }

  public stopSpeaking() {
    this.speechRequestId += 1;
    if (this.speechTimer) {
      clearTimeout(this.speechTimer);
      this.speechTimer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentSpeechSource) {
      this.currentSpeechSource.onended = null;
      this.currentSpeechSource.stop();
      this.currentSpeechSource.disconnect();
      this.currentSpeechGain?.disconnect();
      this.currentSpeechSource = null;
      this.currentSpeechGain = null;
    }
  }
}

export const audioEngine = new AudioEngine();
