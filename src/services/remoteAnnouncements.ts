import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const REMOTE_SPEAKER_NODE_ID = 'ruang-tu';
export const REMOTE_RECEIVER_STORAGE_KEY = 'aurabell_remote_receiver_enabled';
export type RemoteReceiverStatus = 'disabled' | 'connecting' | 'connected' | 'error';

export interface RemoteAnnouncement {
  id: string;
  announcement_text: string;
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
