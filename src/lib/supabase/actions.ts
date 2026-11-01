import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { crearPublicacionServerAction } from '@/lib/supabase/server-actions';
import { DEMO_USERS, INITIAL_PUBLICACIONES } from '@/lib/supabase/mockData';
import {
  validateLoginCredentials,
  validatePublicacionInput,
  isValidResourceId,
} from '@/lib/security/validation';
import {
  COMPLEJIDADES_VALIDAS,
  type ComplejidadPublicacion,
  type NuevaPublicacionInput,
  type PublicacionInput,
  type Publicacion,
  type RolUsuario,
  type Usuario,
} from '@/types/inacadt';

const STORAGE_USER_KEY = 'inacadt_active_user';
const STORAGE_PUBLICACIONES_KEY = 'inacadt_local_publicaciones';
const AUTH_COOKIE_NAME = 'inacadt_session';
const TOKEN_COOKIE_NAME = 'sb-access-token';

/**
 * Establece o elimina las cookies de sesión para protección de rutas privadas y Server Actions (RLS)
 */
function setSessionCookie(
  active: boolean,
  rol?: RolUsuario,
  accessToken?: string
) {
  if (typeof document === 'undefined') return;
  if (active) {
    const value = encodeURIComponent(
      JSON.stringify({ authenticated: true, rol: rol || 'Estudiante' })
    );
    document.cookie = `${AUTH_COOKIE_NAME}=${value}; path=/; max-age=86400; SameSite=Lax`;
    if (accessToken) {
      document.cookie = `${TOKEN_COOKIE_NAME}=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
    }
  } else {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * Normaliza el rol leído desde la tabla 'usuarios' de Supabase
 */
function normalizeRol(rawRol?: string | null): RolUsuario {
  if (!rawRol) return 'Estudiante';
  return rawRol.trim().toLowerCase() === 'profesor' ? 'Profesor' : 'Estudiante';
}

/**
 * Normaliza una fila de la tabla 'publicaciones' de Supabase
 */
function normalizePublicacion(row: Record<string, unknown>, index = 0): Publicacion {
  const rawComp = String(row.complejidad ?? 'Sencillo').trim() as ComplejidadPublicacion;
  const complejidad: ComplejidadPublicacion = COMPLEJIDADES_VALIDAS.includes(rawComp)
    ? rawComp
    : 'Sencillo';

  return {
    id: String(row.id ?? `pub-${index}`),
    titulo: String(row.titulo ?? 'Sin título'),
    contenido: String(row.contenido ?? row.descripcion ?? ''),
    categoria: String(row.categoria ?? 'General'),
    complejidad,
    posee_sello_profesor: Boolean(row.posee_sello_profesor),
    autor_id: row.autor_id ? String(row.autor_id) : null,
    autor_nombre: row.autor_nombre ? String(row.autor_nombre) : null,
    cambios_pendientes: (row.cambios_pendientes as Publicacion['cambios_pendientes']) ?? null,
    eliminacion_pendiente: Boolean(row.eliminacion_pendiente),
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

/**
 * Consulta el perfil y el rol ('Profesor' o 'Estudiante') desde la tabla 'usuarios' en Supabase
 */
export async function obtenerRolDesdeTablaUsuarios(
  userId: string,
  email: string,
  fallbackMetaRol?: string
): Promise<Usuario> {
  let nombre = email.split('@')[0];
  let rol: RolUsuario = normalizeRol(fallbackMetaRol);

  if (isSupabaseConfigured()) {
    // 1. Intentar búsqueda por ID primario (vinculado a auth.users.id)
    const { data: byId } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (byId) {
      rol = normalizeRol(byId.rol);
      nombre = byId.nombre || byId.nombre_completo || byId.email || nombre;
      return {
        id: String(byId.id || userId),
        email: String(byId.email || byId.correo || email),
        nombre: String(nombre),
        rol,
      };
    }

    // 2. Fallback: búsqueda por columna 'email' en la tabla 'usuarios'
    const { data: byEmail } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (byEmail) {
      rol = normalizeRol(byEmail.rol);
      nombre = byEmail.nombre || byEmail.nombre_completo || byEmail.email || nombre;
      return {
        id: userId, // Mantener siempre el auth.uid() real para cumplir políticas RLS (autor_id = auth.uid())
        email: String(byEmail.email || email),
        nombre: String(nombre),
        rol,
      };
    }
  }

  return {
    id: userId,
    email,
    nombre,
    rol,
  };
}

/**
 * RF01: Iniciar sesión con Supabase Auth y obtener el rol desde la tabla 'usuarios'
 */
export async function iniciarSesionSupabase(
  emailInput: string,
  passwordInput: string
): Promise<{ ok: boolean; user?: Usuario; error?: string; mode?: 'supabase' | 'demo' }> {
  // 1. Validación en cliente/servidor contra inyecciones (OWASP)
  const validation = validateLoginCredentials(emailInput, passwordInput);
  if (!validation.valid) {
    const errorMsg =
      validation.errors.general ||
      validation.errors.email ||
      validation.errors.password ||
      'Credenciales inválidas.';
    return { ok: false, error: errorMsg };
  }

  const email = validation.sanitizedEmail;

  // 2. Autenticación contra Supabase Auth si las variables de entorno están configuradas
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordInput,
    });

    if (!error && data.user) {
      const metaRol =
        (data.user.user_metadata?.rol as string | undefined) ||
        (data.user.app_metadata?.rol as string | undefined);

      const perfil = await obtenerRolDesdeTablaUsuarios(
        data.user.id,
        data.user.email || email,
        metaRol
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(perfil));
        setSessionCookie(true, perfil.rol, data.session?.access_token);
      }

      return { ok: true, user: perfil, mode: 'supabase' };
    }

    // Si presionó el botón de acceso rápido de demostración con Supabase activo y el usuario aún no existe en Auth, intentar registrarlo en Supabase Auth para tener un auth.uid() real
    if (DEMO_USERS[email] && passwordInput === 'Inacadt2026!') {
      const demoConfig = DEMO_USERS[email];
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: passwordInput,
        options: {
          data: {
            nombre: demoConfig.nombre,
            rol: demoConfig.rol,
          },
        },
      });

      if (!signUpError && signUpData.user && signUpData.session) {
        await supabase.from('usuarios').upsert(
          [
            {
              id: signUpData.user.id,
              email,
              nombre: demoConfig.nombre,
              rol: demoConfig.rol,
            },
          ],
          { onConflict: 'id' }
        );

        const realDemoUser: Usuario = {
          id: signUpData.user.id,
          email,
          nombre: demoConfig.nombre,
          rol: demoConfig.rol,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(realDemoUser));
          setSessionCookie(true, realDemoUser.rol, signUpData.session.access_token);
        }

        return { ok: true, user: realDemoUser, mode: 'supabase' };
      }
    }

    return {
      ok: false,
      error:
        error?.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos en Supabase Auth. Ingresa con un usuario registrado en tu proyecto Supabase o regístrate en la pestaña "Registrar Cuenta en Supabase".'
          : error?.message || 'No fue posible iniciar sesión con Supabase Auth.',
    };
  }

  // 3. Modo Prototipo Local (solo cuando NO están configuradas las variables de entorno de Supabase)
  const demoMatch = DEMO_USERS[email];
  if (demoMatch) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(demoMatch));
      setSessionCookie(true, demoMatch.rol);
    }
    return { ok: true, user: demoMatch, mode: 'demo' };
  }

  const inferredRol: RolUsuario =
    email.includes('profesor') || email.includes('docente') ? 'Profesor' : 'Estudiante';

  const fallbackUser: Usuario = {
    id: `usr-${Date.now()}`,
    email,
    nombre: email.split('@')[0],
    rol: inferredRol,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fallbackUser));
    setSessionCookie(true, fallbackUser.rol);
  }

  return { ok: true, user: fallbackUser, mode: 'demo' };
}

/**
 * RF01 Auxiliar: Registro de usuario en Supabase Auth + inserción en tabla 'usuarios'
 */
export async function registrarUsuarioSupabase(params: {
  email: string;
  password: string;
  nombre: string;
  rol: RolUsuario;
}): Promise<{ ok: boolean; user?: Usuario; error?: string; message?: string }> {
  const validation = validateLoginCredentials(params.email, params.password);
  if (!validation.valid) {
    return {
      ok: false,
      error:
        validation.errors.general ||
        validation.errors.email ||
        validation.errors.password ||
        'Datos de registro inválidos.',
    };
  }

  const email = validation.sanitizedEmail;
  const nombreLimpio = params.nombre.trim() || email.split('@')[0];

  if (!isSupabaseConfigured()) {
    const localUser: Usuario = {
      id: `usr-${Date.now()}`,
      email,
      nombre: nombreLimpio,
      rol: params.rol,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(localUser));
      setSessionCookie(true, localUser.rol);
    }
    return {
      ok: true,
      user: localUser,
      message: 'Cuenta creada en modo demostración local.',
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        nombre: nombreLimpio,
        rol: params.rol,
      },
    },
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message || 'Error al registrar usuario en Supabase Auth.',
    };
  }

  // Insertar registro en la tabla 'usuarios' con el rol seleccionado ('Profesor' | 'Estudiante')
  await supabase.from('usuarios').upsert(
    [
      {
        id: data.user.id,
        email,
        nombre: nombreLimpio,
        rol: params.rol,
      },
    ],
    { onConflict: 'id' }
  );

  const nuevoUsuario: Usuario = {
    id: data.user.id,
    email,
    nombre: nombreLimpio,
    rol: params.rol,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nuevoUsuario));
    setSessionCookie(true, nuevoUsuario.rol, data.session?.access_token);
  }

  return {
    ok: true,
    user: nuevoUsuario,
    message: 'Usuario registrado exitosamente en Supabase Auth y tabla usuarios.',
  };
}

/**
 * Obtiene la sesión actual del usuario verificando explícitamente supabase.auth.getUser()
 */
export async function obtenerSesionActual(): Promise<Usuario | null> {
  if (isSupabaseConfigured()) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = authUser ?? sessionData.session?.user;

    if (sessionUser) {
      const metaRol =
        (sessionUser.user_metadata?.rol as string | undefined) ||
        (sessionUser.app_metadata?.rol as string | undefined);

      const perfil = await obtenerRolDesdeTablaUsuarios(
        sessionUser.id,
        sessionUser.email || '',
        metaRol
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(perfil));
        setSessionCookie(true, perfil.rol, sessionData.session?.access_token);
      }
      return perfil;
    }

    // Si Supabase está configurado pero no hay sesión real en Supabase Auth, limpiar cualquier sesión demo residual para evitar errores RLS (auth.uid() nulo)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_USER_KEY);
      setSessionCookie(false);
    }
    return null;
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_USER_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Usuario;
        setSessionCookie(true, parsed.rol);
        return parsed;
      } catch {
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    }
  }

  return null;
}

/**
 * Cierra la sesión en Supabase Auth y limpia las credenciales locales
 */
export async function cerrarSesionSupabase(): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_USER_KEY);
    setSessionCookie(false);
  }
}

/**
 * RF03 / RF04: Obtener las publicaciones del muro desde la tabla 'publicaciones' de Supabase
 */
export async function obtenerPublicacionesMuro(): Promise<{
  publicaciones: Publicacion[];
  source: 'supabase' | 'local';
  error?: string;
}> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*');

    if (!error && Array.isArray(data)) {
      const normalized = data.map((row, idx) =>
        normalizePublicacion(row as Record<string, unknown>, idx)
      );
      return {
        publicaciones: normalized,
        source: 'supabase',
      };
    }

    const localFallback = obtenerPublicacionesLocales();
    return {
      publicaciones: localFallback,
      source: 'local',
      error: error?.message,
    };
  }

  return {
    publicaciones: obtenerPublicacionesLocales(),
    source: 'local',
  };
}

function obtenerPublicacionesLocales(): Publicacion[] {
  if (typeof window === 'undefined') return INITIAL_PUBLICACIONES;
  const saved = localStorage.getItem(STORAGE_PUBLICACIONES_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as Publicacion[];
    } catch {
      return INITIAL_PUBLICACIONES;
    }
  }
  localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(INITIAL_PUBLICACIONES));
  return INITIAL_PUBLICACIONES;
}

/**
 * RF03: Crear una nueva publicación en el muro cumpliendo RLS estricto (auth.uid() = autor_id)
 */
export async function crearPublicacionMuro(
  input: NuevaPublicacionInput,
  usuarioActual: Usuario
): Promise<{ ok: boolean; data?: Publicacion; error?: string }> {
  // 1. Validación OWASP en el cliente
  const validation = validatePublicacionInput(input);
  if (!validation.valid || !validation.sanitizedData) {
    const firstErr =
      validation.errors.general ||
      validation.errors.titulo ||
      validation.errors.contenido ||
      validation.errors.categoria ||
      validation.errors.complejidad ||
      'Datos inválidos.';
    return { ok: false, error: firstErr };
  }

  if (isSupabaseConfigured()) {
    // 2. Obtener explícitamente el ID del usuario autenticado con supabase.auth.getUser()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        error:
          'No se pudo verificar tu sesión en Supabase Auth (auth.uid() requerido por RLS). Por favor, cierra sesión y vuelve a ingresar.',
      };
    }

    // Obtener token de sesión actual y sincronizar cookie de servidor
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (accessToken) {
      setSessionCookie(true, usuarioActual.rol, accessToken);
    }

    // 3. Invocar la Server Action que utiliza createServerClient con las cookies del servidor
    // y fuerza autor_id = user.id tras verificar supabase.auth.getUser()
    const serverResult = await crearPublicacionServerAction(
      validation.sanitizedData,
      accessToken
    );

    if (serverResult.ok && serverResult.data) {
      const nuevaPub = normalizePublicacion(
        serverResult.data as unknown as Record<string, unknown>
      );
      return { ok: true, data: nuevaPub };
    }

    // 4. Respaldo directo con el cliente autenticado forzando autor_id === user.id
    const payloadConAutor = {
      titulo: validation.sanitizedData.titulo,
      contenido: validation.sanitizedData.contenido,
      categoria: validation.sanitizedData.categoria,
      complejidad: validation.sanitizedData.complejidad,
      posee_sello_profesor: false,
      autor_id: user.id, // Forzado explícitamente al ID devuelto por supabase.auth.getUser()
    };

    const { data: directData, error: directError } = await supabase
      .from('publicaciones')
      .insert([payloadConAutor])
      .select('*')
      .single();

    if (directError) {
      return {
        ok: false,
        error:
          serverResult.error ||
          `Error al insertar en Supabase: ${directError.message}`,
      };
    }

    const nuevaPubDirecta = normalizePublicacion(
      directData as Record<string, unknown>
    );
    return { ok: true, data: nuevaPubDirecta };
  }

  // Modo demostración local sin Supabase configurado
  const mockPub: Publicacion = {
    id: `pub-${Date.now()}`,
    ...validation.sanitizedData,
    posee_sello_profesor: false,
    autor_id: usuarioActual.id,
    autor_nombre: usuarioActual.nombre,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const actuales = obtenerPublicacionesLocales();
    const actualizadas = [mockPub, ...actuales];
    localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actualizadas));
  }

  return { ok: true, data: mockPub };
}

/**
 * RF08 (Funcionalidad Crítica): Otorgar el Sello de Profesor a una publicación mediante la API
 * Actualiza 'posee_sello_profesor' a true en la tabla 'publicaciones' de Supabase.
 */
export async function otorgarSelloProfesorAction(
  publicacionId: string,
  usuarioActual: Usuario
): Promise<{ ok: boolean; error?: string; message?: string }> {
  if (!isValidResourceId(publicacionId)) {
    return {
      ok: false,
      error: 'ID de publicación no válido.',
    };
  }

  if (usuarioActual.rol !== 'Profesor') {
    return {
      ok: false,
      error: 'Operación no autorizada: Solo un usuario con rol Profesor puede otorgar el sello.',
    };
  }

  let accessToken: string | undefined;
  if (isSupabaseConfigured()) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  }

  const response = await fetch(
    `/api/publicaciones/${encodeURIComponent(publicacionId)}/sello`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        usuarioId: usuarioActual.id,
        usuarioEmail: usuarioActual.email,
        rol: usuarioActual.rol,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    return {
      ok: false,
      error: result.error || 'No se pudo otorgar el Sello de Profesor.',
    };
  }

  // Sincronizar almacenamiento local si aplica
  if (typeof window !== 'undefined') {
    const actuales = obtenerPublicacionesLocales();
    const actualizadas = actuales.map((pub) =>
      pub.id === publicacionId ? { ...pub, posee_sello_profesor: true } : pub
    );
    localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actualizadas));
  }

  return {
    ok: true,
    message: result.message || 'Sello de Profesor otorgado exitosamente.',
  };
}

/**
 * Permite insertar las publicaciones de ejemplo en la tabla 'publicaciones' de Supabase si está vacía
 */
export async function cargarDatosEjemploEnSupabase(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_PUBLICACIONES_KEY,
        JSON.stringify(INITIAL_PUBLICACIONES)
      );
    }
    return { ok: true };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      error: 'Debes estar autenticado en Supabase para cargar datos de ejemplo.',
    };
  }

  const payload = INITIAL_PUBLICACIONES.map((pub) => ({
    titulo: pub.titulo,
    contenido: pub.contenido,
    categoria: pub.categoria,
    complejidad: pub.complejidad,
    posee_sello_profesor: pub.posee_sello_profesor,
    autor_id: user.id,
  }));

  const { error } = await supabase.from('publicaciones').insert(payload);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function getCrudAccessToken(): Promise<string | undefined> {
    if (!isSupabaseConfigured()) return Promise.resolve(undefined);
    return supabase.auth.getSession().then(({ data }) => data.session?.access_token);
  }

  /**
   * Actualiza una publicación. En publicaciones selladas, el servidor conserva
   * los datos visibles y registra el cambio para aprobación docente.
   */
export async function actualizarPublicacionMuro(
    publicacionId: string,
    input: PublicacionInput,
    usuarioActual: Usuario
  ): Promise<{ ok: boolean; data?: Publicacion; error?: string; message?: string }> {
    if (!isValidResourceId(publicacionId)) return { ok: false, error: 'ID de publicación no válido.' };
    const validation = validatePublicacionInput(input);
    if (!validation.valid || !validation.sanitizedData) {
      return { ok: false, error: Object.values(validation.errors).find(Boolean) || 'Datos inválidos.' };
    }

    if (!isSupabaseConfigured()) {
      const actuales = obtenerPublicacionesLocales();
      const index = actuales.findIndex((pub) => pub.id === publicacionId);
      const actual = actuales[index];
      if (!actual) return { ok: false, error: 'Publicación no encontrada.' };
      if (actual.autor_id !== usuarioActual.id && usuarioActual.rol !== 'Profesor') {
        return { ok: false, error: 'Solo puedes modificar publicaciones de tu autoría.' };
      }
      const cambio = usuarioActual.rol === 'Estudiante' && actual.posee_sello_profesor
        ? { ...actual, cambios_pendientes: validation.sanitizedData }
        : { ...actual, ...validation.sanitizedData };
      actuales[index] = cambio;
      localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actuales));
      return {
        ok: true,
        data: cambio,
        message: cambio.cambios_pendientes ? 'Cambios enviados para aprobación de un profesor.' : 'Publicación actualizada correctamente.',
      };
    }

    const token = await getCrudAccessToken();
    const response = await fetch(`/api/publicaciones/${encodeURIComponent(publicacionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(validation.sanitizedData),
    });
    const result = await response.json() as { ok: boolean; data?: Publicacion; error?: string; message?: string };
    return response.ok && result.ok
      ? result
      : { ok: false, error: result.error || 'No se pudo actualizar la publicación.' };
  }

export async function eliminarPublicacionMuro(
    publicacionId: string,
    usuarioActual: Usuario
  ): Promise<{ ok: boolean; error?: string; message?: string }> {
    if (!isValidResourceId(publicacionId)) return { ok: false, error: 'ID de publicación no válido.' };
    if (!isSupabaseConfigured()) {
      const actuales = obtenerPublicacionesLocales();
      const actual = actuales.find((pub) => pub.id === publicacionId);
      if (!actual) return { ok: false, error: 'Publicación no encontrada.' };
      if (actual.autor_id !== usuarioActual.id && usuarioActual.rol !== 'Profesor') {
        return { ok: false, error: 'Solo puedes eliminar publicaciones de tu autoría.' };
      }
      if (usuarioActual.rol === 'Estudiante' && actual.posee_sello_profesor) {
        const actualizadas = actuales.map((pub) => pub.id === publicacionId ? { ...pub, eliminacion_pendiente: true } : pub);
        localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actualizadas));
        return { ok: true, message: 'Eliminación enviada para aprobación de un profesor.' };
      }
      localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actuales.filter((pub) => pub.id !== publicacionId)));
      return { ok: true, message: 'Publicación eliminada correctamente.' };
    }

    const token = await getCrudAccessToken();
    const response = await fetch(`/api/publicaciones/${encodeURIComponent(publicacionId)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const result = await response.json() as { ok: boolean; error?: string; message?: string };
    return response.ok && result.ok
      ? result
      : { ok: false, error: result.error || 'No se pudo eliminar la publicación.' };
  }

export async function aprobarCambiosPublicacion(
    publicacionId: string,
    usuarioActual: Usuario
  ): Promise<{ ok: boolean; data?: Publicacion; error?: string; message?: string }> {
    if (usuarioActual.rol !== 'Profesor' || !isValidResourceId(publicacionId)) {
      return { ok: false, error: 'Solo un profesor puede aprobar cambios.' };
    }
    if (!isSupabaseConfigured()) {
      const actuales = obtenerPublicacionesLocales();
      const actual = actuales.find((pub) => pub.id === publicacionId);
      if (!actual) return { ok: false, error: 'Publicación no encontrada.' };
      if (actual.eliminacion_pendiente) {
        localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actuales.filter((pub) => pub.id !== publicacionId)));
        return { ok: true, message: 'Eliminación aprobada.' };
      }
      if (!actual.cambios_pendientes) return { ok: false, error: 'La publicación no tiene cambios pendientes.' };
      const updated = { ...actual, ...actual.cambios_pendientes, cambios_pendientes: null };
      localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actuales.map((pub) => pub.id === publicacionId ? updated : pub)));
      return { ok: true, data: updated, message: 'Cambios aprobados correctamente.' };
    }
    const token = await getCrudAccessToken();
    const response = await fetch(`/api/publicaciones/${encodeURIComponent(publicacionId)}/aprobacion`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const result = await response.json() as { ok: boolean; data?: Publicacion; error?: string; message?: string };
    return response.ok && result.ok
      ? result
      : { ok: false, error: result.error || 'No se pudieron aprobar los cambios.' };
  }