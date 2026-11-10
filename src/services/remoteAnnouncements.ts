import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const REMOTE_SPEAKER_NODE_ID = 'ruang-tu';
export const REMOTE_RECEIVER_STORAGE_KEY = 'aurabell_remote_receiver_enabled';
export type RemoteReceiverStatus = 'disabled' | 'connecting' | 'connected' | 'error';

export interface RemoteAnnouncement {
  id: string;
  announcement_text: string;
}

export interface RemoteAudioTrack {
  id: string;
  title: string;
  category: string;
  duration: string;
}

export type RemoteAudioAction = 'play' | 'pause' | 'stop';

export interface RemoteAudioCommand {
  id: string;
  action: RemoteAudioAction;
  track_id: string | null;
}

export interface RemoteAudioCatalog {
  tracks: RemoteAudioTrack[];
  isOnline: boolean;
}

function isRemoteAudioCommand(value: unknown): value is RemoteAudioCommand {
  if (!value || typeof value !== 'object') return false;
  const command = value as Partial<RemoteAudioCommand>;
  return typeof command.id === 'string' &&
    (command.action === 'play' || command.action === 'pause' || command.action === 'stop') &&
    (typeof command.track_id === 'string' || command.track_id === null);
}

function isRemoteAnnouncement(value: unknown): value is RemoteAnnouncement {
  if (!value || typeof value !== 'object') return false;
  const announcement = value as Partial<RemoteAnnouncement>;
  return typeof announcement.id === 'string' &&
    typeof announcement.announcement_text === 'string';
}

export async function sendRemoteAnnouncement(text: string): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.rpc('send_remote_announcement', {
    p_node_id: REMOTE_SPEAKER_NODE_ID,
    p_text: text,
  });
  if (error) throw error;
}

export async function claimRemoteAnnouncement(
  commandId: string
): Promise<RemoteAnnouncement | null> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.rpc('claim_remote_announcement', {
    p_command_id: commandId,
    p_node_id: REMOTE_SPEAKER_NODE_ID,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return null;
  return data.find(isRemoteAnnouncement) ?? null;
}

export async function completeRemoteAnnouncement(
  commandId: string,
  failureMessage?: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.rpc('complete_remote_announcement', {
    p_command_id: commandId,
    p_failure: failureMessage ?? null,
  });
  if (error) throw error;
}

export async function publishRemoteAudioLibrary(tracks: RemoteAudioTrack[]): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.rpc('publish_remote_audio_library', {
    p_node_id: REMOTE_SPEAKER_NODE_ID,
    p_tracks: tracks,
  });
  if (error) throw error;
}

export async function fetchRemoteAudioLibrary(): Promise<RemoteAudioCatalog> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.rpc('get_remote_audio_library', {
    p_node_id: REMOTE_SPEAKER_NODE_ID,
  });
  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) return { tracks: [], isOnline: false };
  const tracks: unknown = data[0].tracks;
  if (!Array.isArray(tracks)) return { tracks: [], isOnline: false };
  const validTracks = tracks.filter((track): track is RemoteAudioTrack => {
    if (!track || typeof track !== 'object') return false;
    const candidate = track as Partial<RemoteAudioTrack>;
    return typeof candidate.id === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.category === 'string' &&
      typeof candidate.duration === 'string';
  });
  return { tracks: validTracks, isOnline: data[0].is_online === true };
}

export async function deactivateRemoteAudioLibrary(): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.rpc('deactivate_remote_audio_library', {
    p_node_id: REMOTE_SPEAKER_NODE_ID,
  });
  if (error) throw error;
}

export async function sendRemoteAudioCommand(
  action: RemoteAudioAction,
  trackId?: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.rpc('send_remote_audio_command', {
    p_node_id: REMOTE_SPEAKER_NODE_ID,
    p_action: action,
    p_track_id: trackId ?? null,
  });
  if (error) throw error;
}

export async function claimRemoteAudioCommand(
  commandId: string
): Promise<RemoteAudioCommand | null> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.rpc('claim_remote_audio_command', {
    p_command_id: commandId,
    p_node_id: REMOTE_SPEAKER_NODE_ID,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return null;
  return data.find(isRemoteAudioCommand) ?? null;
}

export async function completeRemoteAudioCommand(
  commandId: string,
  failureMessage?: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.rpc('complete_remote_audio_command', {
    p_command_id: commandId,
    p_failure: failureMessage ?? null,
  });
  if (error) throw error;
}

export function subscribeToRemoteAnnouncements(
  onAnnouncement: (commandId: string) => void,
  onError: (message: string) => void,
  onStatus: (status: RemoteReceiverStatus) => void
): () => void {
  if (!supabase) {
    onError('Supabase belum dikonfigurasi; receiver pengumuman remote tidak aktif.');
    onStatus('error');
    return () => {};
  }

  const channel: RealtimeChannel = supabase
    .channel(`remote-announcements-${REMOTE_SPEAKER_NODE_ID}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'remote_announcements',
        filter: `target_node_id=eq.${REMOTE_SPEAKER_NODE_ID}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new.id === 'string') {
          onAnnouncement(payload.new.id);
        }
      }
    );

  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      onStatus('connected');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onStatus('error');
      onError(error?.message ?? `Koneksi receiver Supabase gagal: ${status}`);
    } else if (status === 'CLOSED') {
      onStatus('connecting');
    }
  });

  return () => {
    if (supabase) void supabase.removeChannel(channel);
  };
}

export function subscribeToRemoteAudioCommands(
  onCommand: (commandId: string) => void,
  onError: (message: string) => void,
  onStatus: (status: RemoteReceiverStatus) => void
): () => void {
  if (!supabase) {
    onError('Supabase belum dikonfigurasi; kontrol audio remote tidak aktif.');
    onStatus('error');
    return () => {};
  }

  const channel: RealtimeChannel = supabase
    .channel(`remote-audio-${REMOTE_SPEAKER_NODE_ID}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'remote_audio_commands',
        filter: `target_node_id=eq.${REMOTE_SPEAKER_NODE_ID}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new.id === 'string') {
          onCommand(payload.new.id);
        }
      }
    );

  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      onStatus('connected');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onStatus('error');
      onError(error?.message ?? `Koneksi kontrol audio remote gagal: ${status}`);
    } else if (status === 'CLOSED') {
      onStatus('connecting');
    }
  });

  return () => {
    if (supabase) void supabase.removeChannel(channel);
  };
}
