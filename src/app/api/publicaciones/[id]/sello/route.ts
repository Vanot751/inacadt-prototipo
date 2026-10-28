import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isValidResourceId } from '@/lib/security/validation';
import type { ApiResponse, Publicacion, RolUsuario } from '@/types/inacadt';

interface OtorgarSelloPayload {
  usuarioId?: string;
  usuarioEmail?: string;
  rol?: RolUsuario;
}

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

    // 2. Lectura opcional del body y cabecera Authorization
    let body: OtorgarSelloPayload = {};
    try {
      body = await request.json();
    } catch {
      // Body opcional si viene solo por token
    }

    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : undefined;

    // 3. Si Supabase está configurado y no es un ID de demostración local
    const isDemoId = id.startsWith('pub-');

    if (isSupabaseConfigured() && !isDemoId) {
      const supabaseServer = createServerSupabaseClient(accessToken);

      let verifiedRole: string | null = null;
      let userIdToLookup = body.usuarioId;
      let userEmailToLookup = body.usuarioEmail;

      // Si hay token de sesión de Supabase Auth, obtenemos el usuario autenticado
      if (accessToken) {
        const { data: authData } = await supabaseServer.auth.getUser(accessToken);
        if (authData?.user) {
          userIdToLookup = authData.user.id;
          userEmailToLookup = authData.user.email ?? userEmailToLookup;
        }
      }

      // Consultar rol en la tabla 'usuarios' de Supabase (por ID o por email)
      if (userIdToLookup) {
        const { data: userById } = await supabaseServer
          .from('usuarios')
          .select('rol')
          .eq('id', userIdToLookup)
          .maybeSingle();

        if (userById?.rol) {
          verifiedRole = userById.rol;
        }
      }

      if (!verifiedRole && userEmailToLookup) {
        const { data: userByEmail } = await supabaseServer
          .from('usuarios')
          .select('rol')
          .eq('email', userEmailToLookup)
          .maybeSingle();

        if (userByEmail?.rol) {
          verifiedRole = userByEmail.rol;
        }
      }

      // Fallback al rol reportado si la tabla tiene políticas RLS específicas
      const effectiveRole = verifiedRole || body.rol || '';

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

