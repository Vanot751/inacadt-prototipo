'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Loader2,
  Mail,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  iniciarSesionSupabase,
  registrarUsuarioSupabase,
} from '@/lib/supabase/actions';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { validateLoginCredentials } from '@/lib/security/validation';
import type { RolUsuario } from '@/types/inacadt';

export default function LoginForm() {
  const router = useRouter();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rolRegistro, setRolRegistro] = useState<RolUsuario>('Profesor');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const supabaseActivo = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMensajeExito(null);

    const validation = validateLoginCredentials(email, password);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setCargando(true);
    try {
      if (modo === 'login') {
        const res = await iniciarSesionSupabase(
          validation.sanitizedEmail,
          password
        );
        if (!res.ok) {
          setErrors({ general: res.error });
          return;
        }
        router.push('/dashboard');
        router.refresh();
      } else {
        const res = await registrarUsuarioSupabase({
          email: validation.sanitizedEmail,
          password,
          nombre: nombre.trim() || validation.sanitizedEmail.split('@')[0],
          rol: rolRegistro,
        });
        if (!res.ok) {
          setErrors({ general: res.error });
          return;
        }
        setMensajeExito(
          res.message || 'Usuario creado exitosamente. Redirigiendo al muro...'
        );
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleAccesoRapido = async (
    correoDemo: string,
    passDemo: string
  ) => {
    setErrors({});
    setMensajeExito(null);
    setEmail(correoDemo);
    setPassword(passDemo);
    setCargando(true);
    try {
      const res = await iniciarSesionSupabase(correoDemo, passDemo);
      if (!res.ok) {
        setErrors({ general: res.error });
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-100">
      {/* Barra institucional superior */}
      <div className="bg-red-900 text-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs sm:px-6">
          <span className="font-semibold tracking-wide">
            INACADT · Plataforma de Intercambio de Conocimiento Universitario
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-medium text-red-100">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Tus datos están protegidos según las políticas de privacidad de la institución
          </span>
        </div>
      </div>

      {/* Contenedor central responsivo */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 sm:px-6"
      >
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl lg:grid-cols-12">
          {/* Panel informativo institucional izquierdo */}
          <section
            aria-label="Información institucional de la plataforma"
            className="flex flex-col justify-between bg-red-900 p-8 text-white lg:col-span-5"
          >
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-xl bg-red-950/60 p-3 border border-red-700/70">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-red-900">
                  <GraduationCap className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight">
                    INACADT
                  </h1>
                  <p className="text-xs font-medium text-red-200">
                    Comunidad Académica Universitaria
                  </p>
                </div>
              </div>

              <h2 className="mb-3 text-2xl font-bold leading-tight">
                Muro de Clasificados para Intercambio de Conocimiento
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-red-100">
                Conecta con estudiantes y docentes para compartir mentorías,
                talleres guiados, apuntes técnicos y resolución colaborativa de
                desafíos en Ingeniería Informática.
              </p>

              <ul className="space-y-3.5 text-xs text-red-100">
                <li className="flex items-start gap-2.5">
                  <Award
                    className="h-4 w-4 shrink-0 text-amber-300 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>
                    <strong className="text-white">Sello de Profesor:</strong>{' '}
                    Los docentes validan académicamente las publicaciones
                    destacadas en tiempo real.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-red-200 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>
                    <strong className="text-white">Niveles de complejidad:</strong>{' '}
                    Clasificación estructurada en niveles Sencillo, Avanzado y
                    Asistido.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck
                    className="h-4 w-4 shrink-0 text-red-200 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>
                    <strong className="text-white">Privacidad:</strong>{' '}
                    Tus datos se gestionan de acuerdo con las políticas de la institución.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 border-t border-red-800 pt-4 text-xs text-red-200">
              <p className="font-semibold text-white">
                Estado de la plataforma:
              </p>
              <p className="mt-0.5">
                {supabaseActivo
                  ? 'Servicio institucional disponible.'
                  : 'Modo demostración activo.'}
              </p>
            </div>
          </section>

          {/* Formulario de acceso */}
          <section
            aria-labelledby="auth-heading"
            className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-7"
          >
            {/* Selector de pestaña Iniciar Sesión / Crear Cuenta */}
            <div className="mb-6 flex rounded-lg border border-slate-300 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setModo('login');
                  setErrors({});
                  setMensajeExito(null);
                }}
                className={`flex-1 rounded-md py-2 text-xs font-bold transition ${
                  modo === 'login'
                    ? 'bg-red-800 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setModo('registro');
                  setErrors({});
                  setMensajeExito(null);
                }}
                className={`flex-1 rounded-md py-2 text-xs font-bold transition ${
                  modo === 'registro'
                    ? 'bg-red-800 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            <div className="mb-6">
              <h2
                id="auth-heading"
                className="text-2xl font-extrabold text-slate-900"
              >
                {modo === 'login'
                  ? 'Acceso Institucional'
                  : 'Registro de Usuario Académico'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {modo === 'login'
                  ? 'Ingresa tus credenciales para acceder al Muro de Publicaciones.'
                  : 'Crea tu cuenta para participar en la comunidad académica.'}
              </p>
            </div>

            {/* Alertas de error o éxito con soporte para lectores de pantalla */}
            {errors.general && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-800 bg-red-50 p-3.5 text-xs font-semibold text-red-900"
              >
                <AlertCircle
                  className="h-4 w-4 shrink-0 text-red-800 mt-0.5"
                  aria-hidden="true"
                />
                <span>{errors.general}</span>
              </div>
            )}

            {mensajeExito && (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-slate-400 bg-slate-100 p-3.5 text-xs font-semibold text-slate-900"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-red-800 mt-0.5"
                  aria-hidden="true"
                />
                <span>{mensajeExito}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {modo === 'registro' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="auth-nombre"
                      className="mb-1.5 block text-sm font-bold text-slate-900"
                    >
                      Nombre Completo
                    </label>
                    <input
                      id="auth-nombre"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Dr. Roberto Morales"
                      maxLength={80}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-800"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-rol"
                      className="mb-1.5 block text-sm font-bold text-slate-900"
                    >
                      Rol institucional
                    </label>
                    <select
                      id="auth-rol"
                      value={rolRegistro}
                      onChange={(e) =>
                        setRolRegistro(e.target.value as RolUsuario)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-red-800"
                    >
                      <option value="Profesor">Profesor</option>
                      <option value="Estudiante">Estudiante</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Correo Electrónico */}
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-sm font-bold text-slate-900"
                >
                  Correo Electrónico Institucional{' '}
                  <span className="text-red-800">*</span>
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@inacapmail.cl"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'err-auth-email' : undefined}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-800"
                  />
                </div>
                {errors.email && (
                  <p
                    id="err-auth-email"
                    role="alert"
                    className="mt-1 text-xs font-semibold text-red-800"
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-sm font-bold text-slate-900"
                >
                  Contraseña <span className="text-red-800">*</span>
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type={mostrarPassword ? 'text' : 'password'}
                    autoComplete={
                      modo === 'login' ? 'current-password' : 'new-password'
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? 'err-auth-password' : undefined
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-800"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute top-2.5 right-3 rounded p-0.5 text-slate-600 hover:text-slate-900"
                    aria-label={
                      mostrarPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    {mostrarPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="err-auth-password"
                    role="alert"
                    className="mt-1 text-xs font-semibold text-red-800"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cargando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : modo === 'login' ? (
                  <span>Ingresar al Muro INACADT</span>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    <span>Registrar y Acceder</span>
                  </>
                )}
              </button>
            </form>

            {/* Panel de Acceso Rápido para Demostración de Evaluación 3 */}
            <div className="mt-7 rounded-xl border border-slate-300 bg-slate-50 p-4">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                Accesos de demostración
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={cargando}
                  onClick={() =>
                    handleAccesoRapido('profesor@inacapmail.cl', 'Inacadt2026!')
                  }
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-red-800 bg-white px-3 py-2 text-xs font-bold text-red-900 transition hover:bg-red-50"
                >
                  <Award className="h-4 w-4 text-red-800" aria-hidden="true" />
                  <span>Entrar como Profesor</span>
                </button>

                <button
                  type="button"
                  disabled={cargando}
                  onClick={() =>
                    handleAccesoRapido(
                      'estudiante@inacapmail.cl',
                      'Inacadt2026!'
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100"
                >
                  <UserCheck className="h-4 w-4 text-slate-700" aria-hidden="true" />
                  <span>Entrar como Estudiante</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className="border-t border-slate-300 bg-white py-4 text-center text-xs font-medium text-slate-600">
        INACADT · Comunidad Académica Universitaria · Ingeniería Informática
      </footer>
    </div>
  );
}

