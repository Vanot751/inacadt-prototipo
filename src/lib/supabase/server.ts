import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const effectiveUrl = isSupabaseConfigured()
  ? rawSupabaseUrl
  : 'https://placeholder-inacadt.supabase.co';
const effectiveKey = isSupabaseConfigured()
  ? rawSupabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

/**
 * Crea un cliente de Supabase para el servidor (Server Actions / Route Handlers)
 * con las cookies de sesión del usuario inyectadas automáticamente para cumplir con RLS (auth.uid()).
 */
export async function createSupabaseServerClient(accessTokenFallback?: string) {
  const cookieStore = await cookies();

  // Buscar token en cookie explícita de respaldo si fue sincronizada desde el cliente
  const tokenFromCookie = cookieStore.get('sb-access-token')?.value;
  const bearerToken = accessTokenFallback || tokenFromCookie;

  return createServerClient(effectiveUrl, effectiveKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignorar si se invoca desde un Server Component de solo lectura
        }
      },
    },
    ...(bearerToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
        }
      : {}),
  });
}

