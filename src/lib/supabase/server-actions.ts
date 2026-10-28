'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { validatePublicacionInput } from '@/lib/security/validation';
import type { NuevaPublicacionInput, Publicacion } from '@/types/inacadt';

/**
 * Server Action para crear una publicación en Supabase inyectando las cookies de sesión del servidor.
 * Cumple con la política RLS estricta donde auth.uid() debe coincidir con autor_id en el INSERT.
 */
export async function crearPublicacionServerAction(
  input: NuevaPublicacionInput,
  accessTokenFallback?: string
): Promise<{ ok: boolean; data?: Publicacion; error?: string }> {
  // 1. Validación OWASP de los campos del formulario
  const validation = validatePublicacionInput(input);
  if (!validation.valid || !validation.sanitizedData) {
    const firstError =
      validation.errors.general ||
      validation.errors.titulo ||
      validation.errors.contenido ||
      validation.errors.categoria ||
      validation.errors.complejidad ||
      'Datos de publicación inválidos.';
    return { ok: false, error: firstError };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      data: {
        id: `pub-${Date.now()}`,
        ...validation.sanitizedData,
        posee_sello_profesor: false,
        created_at: new Date().toISOString(),
      },
    };
  }

  try {
    // 2. Inicializar cliente de servidor con las cookies de sesión del usuario inyectadas
    const supabase = await createSupabaseServerClient(accessTokenFallback);

    // 3. Obtener explícitamente el usuario autenticado mediante supabase.auth.getUser()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        error:
          'No se detectó una sesión autenticada en Supabase Auth (auth.uid() nulo). Por favor, cierra sesión y vuelve a ingresar con tus credenciales de Supabase.',
      };
    }

    // 4. Forzar que el campo autor_id sea exactamente igual al ID devuelto por getUser()
    const payloadInsert = {
      titulo: validation.sanitizedData.titulo,
      contenido: validation.sanitizedData.contenido,
      categoria: validation.sanitizedData.categoria,
      complejidad: validation.sanitizedData.complejidad,
      posee_sello_profesor: false,
      autor_id: user.id,
    };

    // 5. Ejecutar el INSERT autenticado cumpliendo la política RLS (auth.uid() = autor_id)
    const { data, error: insertError } = await supabase
      .from('publicaciones')
      .insert([payloadInsert])
      .select('*')
      .single();

    if (insertError) {
      return {
        ok: false,
        error: `Error al insertar en Supabase: ${insertError.message}`,
      };
    }

    return {
      ok: true,
      data: data as Publicacion,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Error inesperado al crear la publicación en el servidor.',
    };
  }
}

