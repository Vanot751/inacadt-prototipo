'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Filter,
  Layers,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/dashboard/Navbar';
import PublicacionCard from '@/components/dashboard/PublicacionCard';
import NuevaPublicacionModal from '@/components/dashboard/NuevaPublicacionModal';
import {
  cargarDatosEjemploEnSupabase,
  cerrarSesionSupabase,
  crearPublicacionMuro,
  obtenerPublicacionesMuro,
  obtenerSesionActual,
  otorgarSelloProfesorAction,
} from '@/lib/supabase/actions';
import { sanitizeText } from '@/lib/security/validation';
import {
  COMPLEJIDADES_VALIDAS,
  type NuevaPublicacionInput,
  type Publicacion,
  type Usuario,
} from '@/types/inacadt';

export default function MuroDashboard() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargandoMuro, setCargandoMuro] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');

  // Filtros del Muro (RF04)
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroComplejidad, setFiltroComplejidad] = useState('Todas');
  const [soloConSello, setSoloConSello] = useState(false);

  // Modal Nueva Publicación (RF03)
  const [modalAbierto, setModalAbierto] = useState(false);

  // Notificaciones accesibles (ARIA live)
  const [notificacion, setNotificacion] = useState<{
    tipo: 'exito' | 'error';
    mensaje: string;
  } | null>(null);

  const cargarMuro = useCallback(async () => {
    setCargandoMuro(true);
    try {
      const res = await obtenerPublicacionesMuro();
      setPublicaciones(res.publicaciones);
      setDataSource(res.source);
    } finally {
      setCargandoMuro(false);
    }
  }, []);

  // Protección de ruta privada en cliente + carga inicial
  useEffect(() => {
    let montado = true;

    async function inicializar() {
      const sesion = await obtenerSesionActual();
      if (!montado) return;

      if (!sesion) {
        router.replace('/login');
        return;
      }

      setUsuario(sesion);
      setVerificandoSesion(false);
      await cargarMuro();
    }

    inicializar();
    return () => {
      montado = false;
    };
  }, [router, cargarMuro]);

  // Cierre de sesión (RF01)
  const handleLogout = async () => {
    await cerrarSesionSupabase();
    router.replace('/login');
    router.refresh();
  };

  // RF08 - Funcionalidad Crítica: Otorgar Sello de Profesor mediante la API
  const handleOtorgarSello = async (publicacionId: string) => {
    if (!usuario) return;
    setNotificacion(null);

    const resultado = await otorgarSelloProfesorAction(publicacionId, usuario);
    if (!resultado.ok) {
      setNotificacion({
        tipo: 'error',
        mensaje:
          resultado.error || 'Ocurrió un error al otorgar el Sello de Profesor.',
      });
      return;
    }

    // Actualización inmediata del estado del muro
    setPublicaciones((prev) =>
      prev.map((pub) =>
        pub.id === publicacionId
          ? { ...pub, posee_sello_profesor: true }
          : pub
      )
    );

    setNotificacion({
      tipo: 'exito',
      mensaje:
        resultado.message ||
        'Sello de Profesor otorgado exitosamente (posee_sello_profesor = true).',
    });
  };

  // RF03: Crear nueva publicación
  const handleCrearPublicacion = async (input: NuevaPublicacionInput) => {
    if (!usuario) return { ok: false, error: 'Sesión no válida.' };
    const res = await crearPublicacionMuro(input, usuario);
    if (res.ok && res.data) {
      setPublicaciones((prev) => [res.data!, ...prev]);
      setNotificacion({
        tipo: 'exito',
        mensaje: 'Publicación agregada al muro de conocimiento exitosamente.',
      });
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  // Sembrar datos iniciales si la tabla de Supabase está vacía
  const handleSembrarEjemplo = async () => {
    setCargandoMuro(true);
    const res = await cargarDatosEjemploEnSupabase();
    if (res.ok) {
      await cargarMuro();
      setNotificacion({
        tipo: 'exito',
        mensaje: 'Publicaciones académicas de ejemplo cargadas correctamente.',
      });
    } else {
      setCargandoMuro(false);
      setNotificacion({
        tipo: 'error',
        mensaje: res.error || 'No se pudieron cargar los datos de ejemplo.',
      });
    }
  };

  // Categorías dinámicas disponibles en las publicaciones
  const categoriasDisponibles = useMemo(() => {
    const setCats = new Set<string>();
    publicaciones.forEach((p) => {
      if (p.categoria) setCats.add(p.categoria);
    });
    return ['Todas', ...Array.from(setCats)];
  }, [publicaciones]);

  // Filtrado de publicaciones (RF04)
  const publicacionesFiltradas = useMemo(() => {
    const terminoLimpio = sanitizeText(busqueda).toLowerCase();

    return publicaciones.filter((pub) => {
      const coincideTexto =
        !terminoLimpio ||
        pub.titulo.toLowerCase().includes(terminoLimpio) ||
        pub.contenido.toLowerCase().includes(terminoLimpio) ||
        pub.categoria.toLowerCase().includes(terminoLimpio);

      const coincideCategoria =
        filtroCategoria === 'Todas' || pub.categoria === filtroCategoria;

      const coincideComplejidad =
        filtroComplejidad === 'Todas' || pub.complejidad === filtroComplejidad;

      const coincideSello = !soloConSello || Boolean(pub.posee_sello_profesor);

      return (
        coincideTexto &&
        coincideCategoria &&
        coincideComplejidad &&
        coincideSello
      );
    });
  }, [
    publicaciones,
    busqueda,
    filtroCategoria,
    filtroComplejidad,
    soloConSello,
  ]);

  // Estadísticas del muro
  const totalConSello = useMemo(
    () => publicaciones.filter((p) => p.posee_sello_profesor).length,
    [publicaciones]
  );

  if (verificandoSesion || !usuario) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-900"
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="mb-3 h-8 w-8 animate-spin text-red-800"
          aria-hidden="true"
        />
        <p className="text-sm font-bold text-slate-800">
          Verificando sesión segura y permisos en Supabase...
        </p>
      </div>
    );
  }

  const esProfesor = usuario.rol === 'Profesor';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar
        usuario={usuario}
        dataSource={dataSource}
        onLogout={handleLogout}
        onNewPublicacionClick={() => setModalAbierto(true)}
      />

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        {/* Banner contextual de Rol e Instrucciones RF08 */}
        <section
          aria-label="Resumen del Muro de Conocimiento"
          className="mb-8 rounded-2xl border border-slate-300 bg-white p-6 shadow-xs"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-1 text-xs font-bold text-red-900 border border-red-200">
                <Sparkles className="h-3.5 w-3.5 text-red-800" aria-hidden="true" />
                <span>Muro de Clasificados Universitarios (RF03 / RF04 / RF08)</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Intercambio de Conocimiento Académico
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-700">
                {esProfesor ? (
                  <>
                    Has iniciado sesión con el rol de{' '}
                    <strong className="font-bold text-red-900">Profesor</strong>{' '}
                    (verificado en tabla <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">usuarios</code>).
                    Puedes validar publicaciones académicas haciendo clic en el
                    botón <strong>&quot;Otorgar Sello&quot;</strong> de cada tarjeta.
                  </>
                ) : (
                  <>
                    Has iniciado sesión con el rol de{' '}
                    <strong className="font-bold text-slate-900">Estudiante</strong>.
                    Explora recursos validados con el{' '}
                    <strong className="text-red-900">Sello de Profesor</strong> o
                    comparte una nueva publicación con la comunidad.
                  </>
                )}
              </p>
            </div>

            {/* Indicadores numéricos rápidos */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold text-slate-600">
                  Total Clasificados
                </p>
                <p className="mt-0.5 text-2xl font-extrabold text-slate-900">
                  {publicaciones.length}
                </p>
              </div>

              <div className="rounded-xl border border-red-300 bg-red-50/70 px-4 py-3 text-center">
                <p className="text-xs font-semibold text-red-900">
                  Con Sello Profesor
                </p>
                <p className="mt-0.5 text-2xl font-extrabold text-red-900">
                  {totalConSello}
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-slate-300 bg-slate-900 px-4 py-3 text-center text-white sm:col-span-1">
                <p className="text-xs font-medium text-slate-300">
                  Permiso RF08
                </p>
                <p className="mt-0.5 text-sm font-bold">
                  {esProfesor ? 'Habilitado (Docente)' : 'Solo Lectura'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notificación de estado tras otorgar sello o crear publicación */}
        {notificacion && (
          <div
            role={notificacion.tipo === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`mb-6 flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-semibold shadow-xs ${
              notificacion.tipo === 'exito'
                ? 'border-red-800 bg-red-900 text-white'
                : 'border-red-800 bg-red-50 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notificacion.tipo === 'exito' ? (
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
              ) : (
                <AlertCircle
                  className="h-5 w-5 shrink-0 text-red-800"
                  aria-hidden="true"
                />
              )}
              <span>{notificacion.mensaje}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificacion(null)}
              className="rounded px-2 py-1 text-xs font-bold underline hover:opacity-80"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Barra de Búsqueda y Filtros (RF04) */}
        <section
          aria-label="Filtros de búsqueda de publicaciones"
          className="mb-6 rounded-xl border border-slate-300 bg-white p-4 shadow-xs"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            {/* Buscador por texto */}
            <div className="md:col-span-4">
              <label
                htmlFor="filtro-busqueda"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                Buscar por título o contenido
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="filtro-busqueda"
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Ej: Docker, SQL, OWASP, WCAG..."
                  maxLength={80}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-500 focus:border-red-800 focus:bg-white"
                />
              </div>
            </div>

            {/* Filtro por Categoría */}
            <div className="md:col-span-3">
              <label
                htmlFor="filtro-categoria"
                className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-800"
              >
                <BookOpen className="h-3.5 w-3.5 text-red-800" aria-hidden="true" />
                Categoría
              </label>
              <select
                id="filtro-categoria"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 focus:border-red-800 focus:bg-white"
              >
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Complejidad (Sencillo, Avanzado, Asistido) */}
            <div className="md:col-span-2">
              <label
                htmlFor="filtro-complejidad"
                className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-800"
              >
                <Layers className="h-3.5 w-3.5 text-red-800" aria-hidden="true" />
                Complejidad
              </label>
              <select
                id="filtro-complejidad"
                value={filtroComplejidad}
                onChange={(e) => setFiltroComplejidad(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 focus:border-red-800 focus:bg-white"
              >
                <option value="Todas">Todas</option>
                {COMPLEJIDADES_VALIDAS.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Sello de Profesor + Botón Actualizar */}
            <div className="flex items-center justify-between gap-2 md:col-span-3">
              <button
                type="button"
                onClick={() => setSoloConSello(!soloConSello)}
                aria-pressed={soloConSello}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  soloConSello
                    ? 'border-red-900 bg-red-900 text-white'
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Award className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Solo Sello Profesor</span>
              </button>

              <button
                type="button"
                onClick={cargarMuro}
                disabled={cargandoMuro}
                aria-label="Actualizar publicaciones del muro"
                title="Recargar publicaciones desde la base de datos"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100 hover:text-red-900 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${cargandoMuro ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </section>

        {/* Listado de Tarjetas de Publicaciones (RF03 / RF04 / RF08) */}
        {cargandoMuro ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-300 bg-white py-16 text-center"
            role="status"
          >
            <Loader2
              className="mb-3 h-8 w-8 animate-spin text-red-800"
              aria-hidden="true"
            />
            <p className="text-sm font-bold text-slate-800">
              Cargando publicaciones del muro académico...
            </p>
          </div>
        ) : publicacionesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-300 bg-white p-12 text-center">
            <Filter
              className="mb-3 h-10 w-10 text-slate-400"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-slate-900">
              No se encontraron publicaciones con estos criterios
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Puedes limpiar los filtros aplicados, crear una nueva publicación
              o cargar las publicaciones académicas de ejemplo.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {publicaciones.length === 0 ? (
                <button
                  type="button"
                  onClick={handleSembrarEjemplo}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-900"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Cargar Publicaciones de Ejemplo en Base de Datos</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('');
                    setFiltroCategoria('Todas');
                    setFiltroComplejidad('Todas');
                    setSoloConSello(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                  Restablecer Filtros
                </button>
              )}
            </div>
          </div>
        ) : (
          <section
            aria-label="Tarjetas de publicaciones del muro"
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {publicacionesFiltradas.map((pub) => (
              <PublicacionCard
                key={pub.id}
                publicacion={pub}
                rolUsuario={usuario.rol}
                onOtorgarSello={handleOtorgarSello}
              />
            ))}
          </section>
        )}
      </main>

      {/* Modal para nueva publicación */}
      <NuevaPublicacionModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSubmit={handleCrearPublicacion}
      />

      {/* Pie de página institucional */}
      <footer className="mt-12 border-t border-slate-300 bg-white py-5 text-center text-xs font-medium text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <span>
            <strong>INACADT</strong> · Plataforma de Intercambio de Conocimiento
            Universitario (Evaluación 3)
          </span>
          <span>
            RNF03 (Identidad Institucional &amp; WCAG 2.1 AA) · Seguridad OWASP ·
            Supabase
          </span>
        </div>
      </footer>
    </div>
  );
}

