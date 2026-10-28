'use client';

import React from 'react';
import {
  GraduationCap,
  LogOut,
  ShieldCheck,
  Award,
  UserCheck,
  Database,
} from 'lucide-react';
import type { Usuario } from '@/types/inacadt';

interface NavbarProps {
  usuario: Usuario;
  dataSource: 'supabase' | 'local';
  onLogout: () => void;
  onNewPublicacionClick: () => void;
}

export default function Navbar({
  usuario,
  dataSource,
  onLogout,
  onNewPublicacionClick,
}: NavbarProps) {
  const esProfesor = usuario.rol === 'Profesor';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-300 bg-white shadow-sm">
      {/* Franja superior institucional */}
      <div className="bg-red-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-red-200" aria-hidden="true" />
            <span>
              Portal Académico INACADT · Comunidad de aprendizaje y colaboración
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded bg-red-950/80 px-2 py-0.5 text-[11px] font-medium text-red-100 border border-red-700"
              title={
                dataSource === 'supabase'
                  ? 'Servicio institucional disponible'
                  : 'Modo demostración activo'
              }
            >
              <Database className="h-3 w-3 text-red-200" aria-hidden="true" />
              {dataSource === 'supabase' ? 'Servicio activo' : 'Modo demostración'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de navegación principal */}
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {/* Identidad de marca */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-800 text-white shadow-sm"
              aria-hidden="true"
            >
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  INACADT
                </span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
                  Comunidad
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600">
                Muro de Clasificados para Intercambio de Conocimiento Universitario
              </p>
            </div>
          </div>
        </div>

        {/* Acciones y Perfil del Usuario Autenticado */}
        <nav
          aria-label="Acciones de usuario y sesión"
          className="flex flex-wrap items-center justify-between gap-3 sm:justify-end"
        >
          <button
            type="button"
            onClick={onNewPublicacionClick}
            className="inline-flex items-center justify-center rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
          >
            + Publicar Clasificado
          </button>

          {/* Perfil de la persona conectada */}
          <div
            className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5"
            aria-label={`Usuario conectado: ${usuario.nombre}, Rol: ${usuario.rol}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${
                esProfesor ? 'bg-red-800' : 'bg-slate-700'
              }`}
              aria-hidden="true"
            >
              {esProfesor ? (
                <Award className="h-4 w-4" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
            </div>
            <div className="text-left leading-tight">
              <p className="max-w-40 truncate text-xs font-bold text-slate-900">
                {usuario.nombre}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.2 text-[11px] font-bold ${
                    esProfesor
                      ? 'bg-red-800 text-white'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  Rol: {usuario.rol}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 hover:text-red-900"
            aria-label="Cerrar sesión y volver al inicio de sesión"
          >
            <LogOut className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

