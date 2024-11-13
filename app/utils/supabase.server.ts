import { createClient } from '@supabase/supabase-js'
import invariant from 'tiny-invariant'

invariant(process.env.SUPABASE_URL, 'SUPABASE_URL must be set')
invariant(process.env.SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY must be set')

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)