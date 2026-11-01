'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  BookPlus,
  Loader2,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  CATEGORIAS_SUGERIDAS,
  COMPLEJIDADES_VALIDAS,
  type ComplejidadPublicacion,
  type NuevaPublicacionInput,
  type Publicacion,
} from '@/types/inacadt';
import { validatePublicacionInput } from '@/lib/security/validation';

interface NuevaPublicacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NuevaPublicacionInput) => Promise<{ ok: boolean; error?: string }>;
  initialData?: Publicacion | null;
}

export default function NuevaPublicacionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
}: NuevaPublicacionModalProps) {
  const [titulo, setTitulo] = useState(initialData?.titulo ?? '');
  const [contenido, setContenido] = useState(initialData?.contenido ?? '');
  const [categoria, setCategoria] = useState(initialData?.categoria ?? CATEGORIAS_SUGERIDAS[0]);
  const [complejidad, setComplejidad] =
    useState<ComplejidadPublicacion>('Sencillo');
  const [errors, setErrors] = useState<{
    titulo?: string;
    contenido?: string;
    categoria?: string;
    complejidad?: string;
    general?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validatePublicacionInput({
      titulo,
      contenido,
      categoria,
      complejidad,
    });

    if (!validation.valid || !validation.sanitizedData) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit(validation.sanitizedData);
      if (!result.ok) {
        setErrors({
          general: result.error || 'Error al guardar la publicación en Supabase.',
        });
      } else {
        setTitulo('');
        setContenido('');
        setCategoria(CATEGORIAS_SUGERIDAS[0]);
        setComplejidad('Sencillo');
        onClose();
      }
    } catch (err) {
      setErrors({
        general:
          err instanceof Error
            ? err.message
            : 'Error inesperado al enviar la publicación.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nueva-publicacion-titulo"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
        {/* Cabecera institucional */}
        <div className="flex items-center justify-between border-b border-red-900 bg-red-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <BookPlus className="h-5 w-5 text-red-200" aria-hidden="true" />
            <h2
              id="modal-nueva-publicacion-titulo"
              className="text-base font-bold"
            >
              {initialData ? 'Editar publicación' : 'Nueva publicación'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-red-100 transition hover:bg-red-800 hover:text-white"
            aria-label="Cerrar ventana modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} noValidate className="p-6 space-y-4">
          {errors.general && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-red-800 bg-red-50 p-3.5 text-xs font-semibold text-red-900"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-800 mt-0.5" aria-hidden="true" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Campo: Título */}
          <div>
            <label
              htmlFor="pub-titulo"
              className="mb-1.5 block text-sm font-bold text-slate-900"
            >
              Título del Clasificado Académico <span className="text-red-800">*</span>
            </label>
            <input
              id="pub-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
              placeholder="Ej: Taller de programación para principiantes"
              aria-invalid={Boolean(errors.titulo)}
              aria-describedby={errors.titulo ? 'err-pub-titulo' : undefined}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-800"
            />
            {errors.titulo && (
              <p
                id="err-pub-titulo"
                role="alert"
                className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-800"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.titulo}
              </p>
            )}
          </div>

          {/* Categoría y Complejidad */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pub-categoria"
                className="mb-1.5 block text-sm font-bold text-slate-900"
              >
                Categoría <span className="text-red-800">*</span>
              </label>
              <select
                id="pub-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-red-800"
              >
                {CATEGORIAS_SUGERIDAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pub-complejidad"
                className="mb-1.5 block text-sm font-bold text-slate-900"
              >
                Complejidad <span className="text-red-800">*</span>
              </label>
              <select
                id="pub-complejidad"
                value={complejidad}
                onChange={(e) =>
                  setComplejidad(e.target.value as ComplejidadPublicacion)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-red-800"
              >
                {COMPLEJIDADES_VALIDAS.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contenido */}
          <div>
            <label
              htmlFor="pub-contenido"
              className="mb-1.5 block text-sm font-bold text-slate-900"
            >
              Contenido y Detalles del Intercambio <span className="text-red-800">*</span>
            </label>
            <textarea
              id="pub-contenido"
              rows={4}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              maxLength={1200}
              placeholder="Describe los temas, requisitos previos, modalidad de estudio o recursos que compartes..."
              aria-invalid={Boolean(errors.contenido)}
              aria-describedby={errors.contenido ? 'err-pub-contenido' : undefined}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-800"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
              <span>Tus datos están protegidos según las políticas de privacidad de la institución</span>
              <span>{contenido.length}/1200</span>
            </div>
            {errors.contenido && (
              <p
                id="err-pub-contenido"
                role="alert"
                className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-800"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.contenido}
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-900 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Publicando...</span>
                </>
              ) : (
                <span>Publicar en el Muro</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
