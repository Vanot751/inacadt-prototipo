import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isValidResourceId, validatePublicacionInput } from '@/lib/security/validation';
import type { ApiResponse, Publicacion, RolUsuario } from '@/types/inacadt';

type RouteContext = { params: Promise<{ id: string }> };

function getAccessToken(request: NextRequest): string | undefined {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
}

async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createSupabaseServerClient(getAccessToken(request));
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, role: null as RolUsuario | null };

  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw new Error(`No se pudo verificar el rol: ${profileError.message}`);

  return {
    supabase,
    user,
    role: profile?.rol === 'Profesor' ? 'Profesor' : 'Estudiante',
  };
}

async function getPublication(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, id: string) {
  const { data, error } = await supabase.from('publicaciones').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Publicacion | null;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Publicacion>>> {
  try {
    const { id } = await context.params;
    if (!isValidResourceId(id)) return NextResponse.json({ ok: false, error: 'ID de publicación inválido.' }, { status: 400 });
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'La publicación no está disponible en modo local.' }, { status: 404 });

    const { supabase } = await getAuthenticatedUser(request);
    const publication = await getPublication(supabase, id);
    if (!publication) return NextResponse.json({ ok: false, error: 'Publicación no encontrada.' }, { status: 404 });
    return NextResponse.json({ ok: true, data: publication });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Error interno.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Publicacion>>> {
  try {
    const { id } = await context.params;
    if (!isValidResourceId(id)) return NextResponse.json({ ok: false, error: 'ID de publicación inválido.' }, { status: 400 });
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'La edición local se gestiona desde el cliente.' }, { status: 400 });

    const { supabase, user, role } = await getAuthenticatedUser(request);
    if (!user || !role) return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
    const current = await getPublication(supabase, id);
    if (!current) return NextResponse.json({ ok: false, error: 'Publicación no encontrada.' }, { status: 404 });
    if (role !== 'Profesor' && current.autor_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'Solo puedes modificar publicaciones de tu autoría.' }, { status: 403 });
    }

    const body = await request.json() as Partial<Record<'titulo' | 'contenido' | 'categoria' | 'complejidad', string>>;
    const validation = validatePublicacionInput({
      titulo: body.titulo ?? current.titulo,
      contenido: body.contenido ?? current.contenido,
      categoria: body.categoria ?? current.categoria,
      complejidad: body.complejidad ?? current.complejidad,
    });
    if (!validation.valid || !validation.sanitizedData) {
      return NextResponse.json({ ok: false, error: Object.values(validation.errors).find(Boolean) || 'Datos inválidos.' }, { status: 400 });
    }

    const updatePayload = role === 'Estudiante' && current.posee_sello_profesor
      ? { cambios_pendientes: validation.sanitizedData, eliminacion_pendiente: false }
      : validation.sanitizedData;
    const { data, error } = await supabase.from('publicaciones').update(updatePayload).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ ok: false, error: `No se pudo actualizar: ${error.message}` }, { status: 500 });
    return NextResponse.json({
      ok: true,
      data: data as Publicacion,
      message: role === 'Estudiante' && current.posee_sello_profesor
        ? 'Cambios enviados para aprobación de un profesor.'
        : 'Publicación actualizada correctamente.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Publicacion>>> {
  try {
    const { id } = await context.params;
    if (!isValidResourceId(id)) return NextResponse.json({ ok: false, error: 'ID de publicación inválido.' }, { status: 400 });
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'La eliminación local se gestiona desde el cliente.' }, { status: 400 });
    const { supabase, user, role } = await getAuthenticatedUser(request);
    if (!user || !role) return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
    const current = await getPublication(supabase, id);
    if (!current) return NextResponse.json({ ok: false, error: 'Publicación no encontrada.' }, { status: 404 });
    if (role !== 'Profesor' && current.autor_id !== user.id) return NextResponse.json({ ok: false, error: 'Solo puedes eliminar publicaciones de tu autoría.' }, { status: 403 });

    if (role === 'Estudiante' && current.posee_sello_profesor) {
      const { data, error } = await supabase.from('publicaciones').update({ eliminacion_pendiente: true }).eq('id', id).select('*').single();
      if (error) return NextResponse.json({ ok: false, error: `No se pudo solicitar la eliminación: ${error.message}` }, { status: 500 });
      return NextResponse.json({ ok: true, data: data as Publicacion, message: 'Eliminación enviada para aprobación de un profesor.' });
    }

    const { error } = await supabase.from('publicaciones').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: `No se pudo eliminar: ${error.message}` }, { status: 500 });
    return NextResponse.json({ ok: true, message: 'Publicación eliminada correctamente.' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Error interno.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Publicacion>>> {
  return PATCH(request, context);
}
