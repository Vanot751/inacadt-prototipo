import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isValidResourceId } from '@/lib/security/validation';
import type { ApiResponse, Publicacion } from '@/types/inacadt';

/**
 * RF08 - Funcionalidad Crítica: Otorgar Sello de Profesor
 * Endpoint: PATCH / POST /api/publicaciones/[id]/sello
 * Verifica que el usuario posea el rol 'Profesor' en la tabla 'usuarios'
 * y actualiza 'posee_sello_profesor' a true en la tabla 'publicaciones' de Supabase.
 */
async function handleOtorgarSello(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Partial<Publicacion>>>> {
  try {
    const { id } = await context.params;

    // 1. Validación OWASP del parámetro ID
    if (!isValidResourceId(id)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Identificador de publicación inválido o potencialmente inseguro (OWASP).',
        },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : undefined;
    let body: { rol?: string } = {};
    try {
      body = await request.json();
    } catch {
      // El cuerpo es opcional cuando se usa la sesión de Supabase.
    }

    // 3. Si Supabase está configurado y no es un ID de demostración local
    const isDemoId = id.startsWith('pub-');

    if (isSupabaseConfigured() && !isDemoId) {
      const supabaseServer = await createSupabaseServerClient(accessToken);

      // Obtener usuario autenticado explícitamente con supabaseServer.auth.getUser()
      const {
        data: { user: authUser },
      } = await supabaseServer.auth.getUser();

      if (!authUser) {
        return NextResponse.json(
          { ok: false, error: 'No autorizado: se requiere una sesión autenticada.' },
          { status: 401 }
        );
      }

      const { data: authenticatedProfile } = await supabaseServer
        .from('usuarios')
        .select('rol')
        .eq('id', authUser.id)
        .maybeSingle();
      const effectiveRole = authenticatedProfile?.rol || '';

      if (effectiveRole.trim().toLowerCase() !== 'profesor') {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Acceso denegado (RF08): Solo los usuarios con rol "Profesor" en la tabla usuarios pueden otorgar el Sello.',
          },
          { status: 403 }
        );
      }

      // 4. Actualizar 'posee_sello_profesor' a true en la tabla 'publicaciones'
      const { data: updatedPub, error: updateError } = await supabaseServer
        .from('publicaciones')
        .update({ posee_sello_profesor: true })
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (updateError) {
        return NextResponse.json(
          {
            ok: false,
            error: `Error al actualizar en Supabase: ${updateError.message}`,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          data: updatedPub ?? { id, posee_sello_profesor: true },
          message: 'Sello de Profesor otorgado y registrado en Supabase exitosamente.',
        },
        { status: 200 }
      );
    }

    // Modo Demostración / Prototipo Local: validar igualmente el rol Profesor
    if ((body.rol || '').trim().toLowerCase() !== 'profesor') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Acceso denegado (RF08): Solo los usuarios con rol "Profesor" pueden otorgar el Sello.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id,
          posee_sello_profesor: true,
        },
        message: 'Sello de Profesor otorgado correctamente mediante la API.',
      },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error interno del servidor en la API.';
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleOtorgarSello(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleOtorgarSello(request, context);
}
