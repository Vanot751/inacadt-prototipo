import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
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
  type Publicacion,
  type RolUsuario,
  type Usuario,
} from '@/types/inacadt';

const STORAGE_USER_KEY = 'inacadt_active_user';
const STORAGE_PUBLICACIONES_KEY = 'inacadt_local_publicaciones';
const AUTH_COOKIE_NAME = 'inacadt_session';

/**
 * Establece o elimina la cookie de sesión para protección de rutas privadas en Proxy/Middleware
 */
function setSessionCookie(active: boolean, rol?: RolUsuario) {
  if (typeof document === 'undefined') return;
  if (active) {
    const value = encodeURIComponent(JSON.stringify({ authenticated: true, rol: rol || 'Estudiante' }));
    document.cookie = `${AUTH_COOKIE_NAME}=${value}; path=/; max-age=86400; SameSite=Lax`;
  } else {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
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
        id: String(byEmail.id || userId),
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
        setSessionCookie(true, perfil.rol);
      }

      return { ok: true, user: perfil, mode: 'supabase' };
    }

    // Si el usuario ingresó las credenciales institucionales de prueba para demostración
    if (DEMO_USERS[email] && passwordInput === 'Inacadt2026!') {
      const demoUser = DEMO_USERS[email];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(demoUser));
        setSessionCookie(true, demoUser.rol);
      }
      return { ok: true, user: demoUser, mode: 'demo' };
    }

    return {
      ok: false,
      error:
        error?.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos en Supabase Auth.'
          : error?.message || 'No fue posible iniciar sesión con Supabase Auth.',
    };
  }

  // 3. Modo Prototipo Local (cuando aún no se configura .env.local)
  const demoMatch = DEMO_USERS[email];
  if (demoMatch) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(demoMatch));
      setSessionCookie(true, demoMatch.rol);
    }
    return { ok: true, user: demoMatch, mode: 'demo' };
  }

  // Si ingresa cualquier correo válido en modo sin .env.local, asigna rol según correo
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
    setSessionCookie(true, nuevoUsuario.rol);
  }

  return {
    ok: true,
    user: nuevoUsuario,
    message: 'Usuario registrado exitosamente en Supabase Auth y tabla usuarios.',
  };
}

/**
 * Obtiene la sesión actual del usuario (protección de ruta privada /dashboard)
 */
export async function obtenerSesionActual(): Promise<Usuario | null> {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;

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
        setSessionCookie(true, perfil.rol);
      }
      return perfil;
    }
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
      // Ordenar mostrando primero las más recientes o destacadas
      return {
        publicaciones: normalized,
        source: 'supabase',
      };
    }

    // Si hubo un error en la tabla (p. ej. aún no se ejecuta el script SQL), usar respaldo local e informar
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
 * RF03: Crear una nueva publicación en el muro
 */
export async function crearPublicacionMuro(
  input: NuevaPublicacionInput,
  usuarioActual: Usuario
): Promise<{ ok: boolean; data?: Publicacion; error?: string }> {
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

  let accessToken: string | undefined;
  if (isSupabaseConfigured()) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  }

  const response = await fetch('/api/publicaciones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      ...validation.sanitizedData,
      autor_nombre: usuarioActual.nombre,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    return {
      ok: false,
      error: result.error || 'No se pudo publicar en el muro.',
    };
  }

  const nuevaPub = normalizePublicacion(result.data);

  // Actualizar copia local también por si se usa en modo demostración
  if (typeof window !== 'undefined') {
    const actuales = obtenerPublicacionesLocales();
    const actualizadas = [nuevaPub, ...actuales];
    localStorage.setItem(STORAGE_PUBLICACIONES_KEY, JSON.stringify(actualizadas));
  }

  return { ok: true, data: nuevaPub };
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

  const payload = INITIAL_PUBLICACIONES.map((pub) => ({
    titulo: pub.titulo,
    contenido: pub.contenido,
    categoria: pub.categoria,
    complejidad: pub.complejidad,
    posee_sello_profesor: pub.posee_sello_profesor,
  }));

  const { error } = await supabase.from('publicaciones').insert(payload);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

