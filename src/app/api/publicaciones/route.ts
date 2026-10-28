import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { INITIAL_PUBLICACIONES } from '@/lib/supabase/mockData';
import { validatePublicacionInput } from '@/lib/security/validation';
import type { ApiResponse, Publicacion } from '@/types/inacadt';

/**
 * RF03 / RF04: Obtener listado de publicaciones del muro desde Supabase
 */
export async function GET(): Promise<NextResponse<ApiResponse<Publicacion[]>>> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      data: INITIAL_PUBLICACIONES,
      message: 'Publicaciones cargadas desde entorno de demostración local.',
    });
  }

  try {
    const supabaseServer = await createSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('publicaciones')
      .select('*');

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          data: INITIAL_PUBLICACIONES,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: (data as Publicacion[]) ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error al consultar publicaciones.',
        data: INITIAL_PUBLICACIONES,
      },
      { status: 500 }
    );
  }
}

/**
 * RF03: Crear una nueva publicación en el muro con validación OWASP y RLS estricto (auth.uid() = autor_id)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Publicacion>>> {
  try {
    const body = await request.json();
    const validation = validatePublicacionInput({
      titulo: body.titulo || '',
      contenido: body.contenido || '',
      categoria: body.categoria || '',
      complejidad: body.complejidad || '',
    });

    if (!validation.valid || !validation.sanitizedData) {
      const firstError =
        validation.errors.general ||
        validation.errors.titulo ||
        validation.errors.contenido ||
        validation.errors.categoria ||
        validation.errors.complejidad ||
        'Datos de publicación inválidos.';

      return NextResponse.json(
        {
          ok: false,
          error: firstError,
        },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : undefined;

    if (isSupabaseConfigured()) {
      // 1. Cliente de servidor con las cookies de sesión del usuario inyectadas
      const supabaseServer = await createSupabaseServerClient(accessToken);

      // 2. Obtener explícitamente el usuario autenticado llamando a supabase.auth.getUser()
      const {
        data: { user },
        error: authError,
      } = await supabaseServer.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'No autorizado: Se requiere una sesión activa en Supabase Auth para insertar publicaciones (RLS auth.uid()).',
          },
          { status: 401 }
        );
      }

      // 3. Forzar que autor_id coincida exactamente con el ID devuelto por getUser()
      const nuevaPublicacion = {
        titulo: validation.sanitizedData.titulo,
        contenido: validation.sanitizedData.contenido,
        categoria: validation.sanitizedData.categoria,
        complejidad: validation.sanitizedData.complejidad,
        posee_sello_profesor: false,
        autor_id: user.id,
      };

      const { data, error } = await supabaseServer
        .from('publicaciones')
        .insert([nuevaPublicacion])
        .select('*')
        .single();

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error: `Error al insertar en Supabase: ${error.message}`,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          data: data as Publicacion,
          message: 'Publicación creada exitosamente en Supabase.',
        },
        { status: 201 }
      );
    }

    // Fallback para modo demostración sin variables de entorno configuradas
    const mockCreated: Publicacion = {
      id: `pub-${Date.now()}`,
      ...validation.sanitizedData,
      posee_sello_profesor: false,
      autor_nombre: body.autor_nombre || 'Usuario INACADT',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        ok: true,
        data: mockCreated,
        message: 'Publicación registrada en el muro.',
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error al procesar solicitud.',
      },
      { status: 500 }
    );
  }
}
