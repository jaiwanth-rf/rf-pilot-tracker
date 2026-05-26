import { createClient } from '@supabase/supabase-js'

// Fallbacks prevent build-time crashes during static generation.
// At runtime these must be set via environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
