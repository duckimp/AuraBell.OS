import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigError =
  !supabaseUrl || !supabasePublishableKey
    ? 'Konfigurasi Supabase belum lengkap. Atur VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.'
    : null;

export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;
