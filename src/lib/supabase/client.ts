import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Verifica si las variables de entorno de Supabase están configuradas con valores reales
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(rawSupabaseUrl) &&
    Boolean(rawSupabaseAnonKey) &&
    rawSupabaseUrl.startsWith('http') &&
    !rawSupabaseUrl.includes('tu-proyecto.supabase.co') &&
    rawSupabaseAnonKey !== 'tu-anon-key-publica'
  );
}

// URL y Key seguras para evitar fallos en tiempo de compilación (next build en Vercel)
const effectiveUrl = isSupabaseConfigured()
  ? rawSupabaseUrl
  : 'https://placeholder-inacadt.supabase.co';
const effectiveKey = isSupabaseConfigured()
  ? rawSupabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

/**
 * Cliente oficial de Supabase con soporte de cookies (@supabase/ssr) para sincronizar
 * la sesión entre cliente y servidor (RLS auth.uid()).
 */
export const supabase: SupabaseClient =
  typeof window !== 'undefined'
    ? createBrowserClient(effectiveUrl, effectiveKey)
    : createClient(effectiveUrl, effectiveKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

/**
 * Crea un cliente de Supabase con el token de acceso del usuario inyectado explícitamente
 */
export function createServerSupabaseClient(accessToken?: string): SupabaseClient {
  return createClient(effectiveUrl, effectiveKey, {
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
