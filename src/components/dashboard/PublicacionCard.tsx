'use client';

import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Layers,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react';
import type {
  ComplejidadPublicacion,
  Publicacion,
  RolUsuario,
} from '@/types/inacadt';

interface PublicacionCardProps {
  publicacion: Publicacion;
  rolUsuario: RolUsuario;
  onOtorgarSello: (id: string) => Promise<void>;
}

const COMPLEJIDAD_STYLES: Record<
  ComplejidadPublicacion,
  { badgeClass: string; label: string }
> = {
  Sencillo: {
    badgeClass: 'bg-slate-100 text-slate-900 border-slate-400',
    label: 'Complejidad: Sencillo',
  },
  Asistido: {
    badgeClass: 'bg-slate-800 text-white border-slate-900',
    label: 'Complejidad: Asistido',
  },
  Avanzado: {
    badgeClass: 'bg-red-950 text-white border-red-900',
    label: 'Complejidad: Avanzado',
  },
};

export default function PublicacionCard({
  publicacion,
  rolUsuario,
  onOtorgarSello,
}: PublicacionCardProps) {
  const [procesandoSello, setProcesandoSello] = useState(false);

  const esProfesor = rolUsuario === 'Profesor';
  const tieneSello = Boolean(publicacion.posee_sello_profesor);
  const complejidadConfig =
    COMPLEJIDAD_STYLES[publicacion.complejidad] ?? COMPLEJIDAD_STYLES.Sencillo;

  const handleClickOtorgarSello = async () => {
    if (procesandoSello || tieneSello || !esProfesor) return;
    setProcesandoSello(true);
    try {
      await onOtorgarSello(publicacion.id);
    } finally {
      setProcesandoSello(false);
    }
  };

  return (
    <article
      aria-labelledby={`pub-title-${publicacion.id}`}
      className={`group relative flex flex-col justify-between rounded-xl bg-white transition-all duration-200 ${
        tieneSello
          ? 'border-2 border-red-800 shadow-md ring-1 ring-red-900/10'
          : 'border border-slate-300 shadow-sm hover:border-slate-400 hover:shadow-md'
      }`}
    >
      {tieneSello ? (
        <div
          className="flex items-center justify-between rounded-t-[10px] bg-red-900 px-4 py-2 text-white"
          role="status"
          aria-label="Publicación destacada con Sello de Profesor"
        >
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Sello de Profesor · Validado Académicamente
            </span>
          </div>
          <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
        </div>
      ) : (
        <div className="h-1.5 w-full rounded-t-xl bg-slate-200" aria-hidden="true" />
      )}

      {/* Cuerpo principal de la tarjeta */}
      <div className="flex flex-1 flex-col p-5">
        {/* Metadatos superiores: Categoría y Complejidad */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
            <BookOpen className="h-3.5 w-3.5 text-red-800" aria-hidden="true" />
            <span>{publicacion.categoria}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${complejidadConfig.badgeClass}`}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{publicacion.complejidad}</span>
          </span>
        </div>

        {/* Título de la publicación */}
        <h2
          id={`pub-title-${publicacion.id}`}
          className="mb-2.5 text-lg font-bold leading-snug text-slate-900 group-hover:text-red-900 transition-colors"
        >
          {publicacion.titulo}
        </h2>

        {/* Contenido de la publicación */}
        <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
          {publicacion.contenido}
        </p>

        {/* Autor / Metadatos secundarios */}
        {publicacion.autor_nombre && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <User className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Publicado por: {publicacion.autor_nombre}</span>
          </div>
        )}
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 rounded-b-xl ${
          tieneSello
            ? 'border-red-200 bg-red-50/70'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        {/* Indicador de estado del Sello */}
        <div className="flex items-center gap-2">
          {tieneSello ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-900">
              <CheckCircle2 className="h-4 w-4 text-red-800" aria-hidden="true" />
              <span>Respaldado con Sello de Profesor</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-600">
              Sin Sello Docente aún
            </span>
          )}
        </div>

        {esProfesor && !tieneSello && (
          <button
            type="button"
            onClick={handleClickOtorgarSello}
            disabled={procesandoSello}
            aria-label={`Otorgar Sello de Profesor a la publicación ${publicacion.titulo}`}
            className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {procesandoSello ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Otorgando...</span>
              </>
            ) : (
              <>
                <Award className="h-4 w-4 text-amber-200" aria-hidden="true" />
                <span>Otorgar Sello de Profesor</span>
              </>
            )}
          </button>
        )}

        {esProfesor && tieneSello && (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-800/30 bg-white px-3 py-1.5 text-xs font-bold text-red-900"
            aria-label="Sello de Profesor ya otorgado"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-red-800" aria-hidden="true" />
            <span>Sello Otorgado</span>
          </span>
        )}
      </div>
    </article>
  );
}

