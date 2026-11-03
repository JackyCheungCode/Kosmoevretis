import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://npkesfmszokmlgnzqelb.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fcYJkZcL3uueN8-Fkz1Qdw_J4YWJwo8';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function requireSupabase() {
  return supabase;
}
