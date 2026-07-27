import { createClient } from '@supabase/supabase-js'

// Fallback to a syntactically valid URL so Vercel doesn't crash the entire Vue app on boot
// if you forgot to add the Environment Variables in the Vercel Dashboard!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://missing-env-var.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-key'

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error('🚨 CRITICAL: Supabase URL is missing! You need to add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Environment Variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
