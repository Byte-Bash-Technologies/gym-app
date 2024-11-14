import { createClient } from '@supabase/supabase-js';
import invariant from 'tiny-invariant';

// Ensure the environment variables are set
invariant(process.env.SUPABASE_URL, 'SUPABASE_URL must be set');
invariant(process.env.SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY must be set');

// Create and export the Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);