import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isValidResourceId } from '@/lib/security/validation';
import type { ApiResponse, Publicacion } from '@/types/inacadt';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Publicacion>>> {
  try {
    const { id } = await context.params;
    if (!isValidResourceId(id)) return NextResponse.json({ ok: false, error: 'ID de publicación inválido.' }, { status: 400 });
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'La aprobación requiere Supabase.' }, { status: 400 });
    const authorization = request.headers.get('authorization');
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
    const supabase = await createSupabaseServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
    const { data: profile } = await supabase.from('usuarios').select('rol').eq('id', user.id).maybeSingle();
    if (profile?.rol !== 'Profesor') return NextResponse.json({ ok: false, error: 'Solo un profesor puede aprobar cambios.' }, { status: 403 });

    const { data: publication, error: readError } = await supabase.from('publicaciones').select('*').eq('id', id).maybeSingle();
    if (readError) return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
    if (!publication) return NextResponse.json({ ok: false, error: 'Publicación no encontrada.' }, { status: 404 });

    if (publication.eliminacion_pendiente) {
      const { error } = await supabase.from('publicaciones').delete().eq('id', id);
      if (error) return NextResponse.json({ ok: false, error: `No se pudo aprobar la eliminación: ${error.message}` }, { status: 500 });
      return NextResponse.json({ ok: true, message: 'Eliminación aprobada.' });
    }

    if (!publication.cambios_pendientes) {
      return NextResponse.json({ ok: false, error: 'La publicación no tiene cambios pendientes.' }, { status: 409 });
    }
    const { data, error } = await supabase.from('publicaciones')
      .update({ ...publication.cambios_pendientes, cambios_pendientes: null, eliminacion_pendiente: false })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ ok: false, error: `No se pudieron aprobar los cambios: ${error.message}` }, { status: 500 });
    return NextResponse.json({ ok: true, data: data as Publicacion, message: 'Cambios aprobados correctamente.' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Error interno.' }, { status: 500 });
  }
}
