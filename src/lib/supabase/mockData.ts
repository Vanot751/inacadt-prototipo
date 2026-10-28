import type { Publicacion, Usuario } from '@/types/inacadt';

export const DEMO_USERS: Record<string, Usuario> = {
  'profesor@inacapmail.cl': {
    id: 'usr-prof-001',
    email: 'profesor@inacapmail.cl',
    nombre: 'Dr. Roberto Morales (Docente TI)',
    rol: 'Profesor',
  },
  'estudiante@inacapmail.cl': {
    id: 'usr-est-002',
    email: 'estudiante@inacapmail.cl',
    nombre: 'Camila Soto (Ing. Informática)',
    rol: 'Estudiante',
  },
};

export const INITIAL_PUBLICACIONES: Publicacion[] = [
  {
    id: 'pub-101',
    titulo: 'Mentoría en Arquitectura de Microservicios con Next.js y Docker',
    contenido:
      'Ofrezco sesiones de estudio práctico para implementar contenedores Docker multi-stage y comunicación segura entre servicios REST/GraphQL para proyectos de Evaluación 3 y Taller de Integración.',
    categoria: 'Arquitectura y Cloud',
    complejidad: 'Avanzado',
    posee_sello_profesor: true,
    autor_nombre: 'Sebastián Valdés',
    created_at: '2026-10-25T14:30:00Z',
  },
  {
    id: 'pub-102',
    titulo: 'Guía Práctica: Prevención de Inyecciones SQL y XSS según OWASP Top 10',
    contenido:
      'Comparto repositorio y taller colaborativo sobre validación de formularios en cliente/servidor, políticas Row Level Security (RLS) en PostgreSQL/Supabase y cabeceras HTTP seguras.',
    categoria: 'Redes y Ciberseguridad',
    complejidad: 'Asistido',
    posee_sello_profesor: false,
    autor_nombre: 'Camila Soto',
    created_at: '2026-10-26T09:15:00Z',
  },
  {
    id: 'pub-103',
    titulo: 'nivelación en Modelamiento de Bases de Datos Relacionales y Normalización (3FN)',
    contenido:
      'Ayudantía abierta para compañeros de primer y segundo año: transformación de modelo entidad-relación (MER) a script DDL en PostgreSQL con claves foráneas e índices.',
    categoria: 'Bases de Datos y SQL',
    complejidad: 'Sencillo',
    posee_sello_profesor: true,
    autor_nombre: 'Matías Riquelme',
    created_at: '2026-10-26T16:45:00Z',
  },
  {
    id: 'pub-104',
    titulo: 'Implementación de Accesibilidad Web WCAG 2.1 Nivel AA con Tailwind CSS',
    contenido:
      'Intercambio de plantillas y checklist de auditoría para contraste de color institucional (>= 4.5:1), navegación por teclado, atributos ARIA y semántica HTML5.',
    categoria: 'Programación y Desarrollo',
    complejidad: 'Sencillo',
    posee_sello_profesor: false,
    autor_nombre: 'Valentina Herrera',
    created_at: '2026-10-27T11:20:00Z',
  },
  {
    id: 'pub-105',
    titulo: 'Optimización de Consultas Complejas y Triggers en Supabase / PostgreSQL',
    contenido:
      'Busco grupo de estudio para analizar planes de ejecución (EXPLAIN ANALYZE), funciones RPC seguras y automatización de roles entre auth.users y tabla pública usuarios.',
    categoria: 'Bases de Datos y SQL',
    complejidad: 'Avanzado',
    posee_sello_profesor: false,
    autor_nombre: 'Diego Fuentes',
    created_at: '2026-10-27T15:00:00Z',
  },
  {
    id: 'pub-106',
    titulo: 'Taller Guiado de Git Flow, Pull Requests y Despliegue Continuo en Vercel',
    contenido:
      'Sesión paso a paso con acompañamiento docente para resolver conflictos de merge, configurar variables de entorno en Vercel y automatizar el pipeline de producción.',
    categoria: 'Ingeniería de Software',
    complejidad: 'Asistido',
    posee_sello_profesor: false,
    autor_nombre: 'Javiera Pizarro',
    created_at: '2026-10-27T18:10:00Z',
  },
];

