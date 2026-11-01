export type RolUsuario = 'Profesor' | 'Estudiante';

export type ComplejidadPublicacion = 'Sencillo' | 'Avanzado' | 'Asistido';

export const COMPLEJIDADES_VALIDAS: ComplejidadPublicacion[] = [
  'Sencillo',
  'Avanzado',
  'Asistido',
];

export const CATEGORIAS_SUGERIDAS: string[] = [
  'Programación y Desarrollo',
  'Bases de Datos y SQL',
  'Redes y Ciberseguridad',
  'Arquitectura y Cloud',
  'Ciencia de Datos e IA',
  'Ingeniería de Software',
  'Matemáticas y Lógica',
];

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  created_at?: string;
}

export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  categoria: string;
  complejidad: ComplejidadPublicacion;
  posee_sello_profesor: boolean;
  autor_id?: string | null;
  autor_nombre?: string | null;
  cambios_pendientes?: Partial<NuevaPublicacionInput> | null;
  eliminacion_pendiente?: boolean;
  created_at?: string;
}

export type PublicacionInput = NuevaPublicacionInput;

export interface NuevaPublicacionInput {
  titulo: string;
  contenido: string;
  categoria: string;
  complejidad: ComplejidadPublicacion;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}
