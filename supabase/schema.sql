-- =============================================================================
-- INACADT - Script DDL e Inicialización para Supabase (PostgreSQL)
-- Evaluación 3 - Ingeniería Informática
-- =============================================================================

-- 1. Tabla 'usuarios' (Almacena perfil y rol: 'Profesor' | 'Estudiante')
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'Estudiante' CHECK (rol IN ('Profesor', 'Estudiante')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla 'publicaciones' (Muro de Clasificados RF03 / RF04 / RF08)
CREATE TABLE IF NOT EXISTS public.publicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL CHECK (char_length(titulo) >= 5 AND char_length(titulo) <= 120),
  contenido TEXT NOT NULL CHECK (char_length(contenido) >= 15 AND char_length(contenido) <= 1200),
  categoria TEXT NOT NULL,
  complejidad TEXT NOT NULL CHECK (complejidad IN ('Sencillo', 'Avanzado', 'Asistido')),
  posee_sello_profesor BOOLEAN NOT NULL DEFAULT FALSE,
  autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  autor_nombre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trigger opcional para sincronizar registros de Supabase Auth hacia public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'Estudiante')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Habilitar Row Level Security (Seguridad OWASP en Base de Datos)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura para usuarios autenticados
CREATE POLICY "Lectura de usuarios para autenticados"
  ON public.usuarios FOR SELECT
  USING (true);

CREATE POLICY "Inserción/Actualización de propio perfil"
  ON public.usuarios FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Lectura de publicaciones del muro"
  ON public.publicaciones FOR SELECT
  USING (true);

CREATE POLICY "Crear publicaciones en el muro"
  ON public.publicaciones FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Actualizar Sello de Profesor (RF08)"
  ON public.publicaciones FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. Datos Semilla (Seed Data) para el Muro de Publicaciones
INSERT INTO public.publicaciones (titulo, contenido, categoria, complejidad, posee_sello_profesor, autor_nombre)
VALUES
  (
    'Mentoría en Arquitectura de Microservicios con Next.js y Docker',
    'Ofrezco sesiones de estudio práctico para implementar contenedores Docker multi-stage y comunicación segura entre servicios REST/GraphQL para proyectos de Evaluación 3 y Taller de Integración.',
    'Arquitectura y Cloud',
    'Avanzado',
    true,
    'Sebastián Valdés'
  ),
  (
    'Guía Práctica: Prevención de Inyecciones SQL y XSS según OWASP Top 10',
    'Comparto repositorio y taller colaborativo sobre validación de formularios en cliente/servidor, políticas Row Level Security (RLS) en PostgreSQL/Supabase y cabeceras HTTP seguras.',
    'Redes y Ciberseguridad',
    'Asistido',
    false,
    'Camila Soto'
  ),
  (
    'Nivelación en Modelamiento de Bases de Datos Relacionales y Normalización (3FN)',
    'Ayudantía abierta para compañeros de primer y segundo año: transformación de modelo entidad-relación (MER) a script DDL en PostgreSQL con claves foráneas e índices.',
    'Bases de Datos y SQL',
    'Sencillo',
    true,
    'Matías Riquelme'
  ),
  (
    'Implementación de Accesibilidad Web WCAG 2.1 Nivel AA con Tailwind CSS',
    'Intercambio de plantillas y checklist de auditoría para contraste de color institucional (>= 4.5:1), navegación por teclado, atributos ARIA y semántica HTML5.',
    'Programación y Desarrollo',
    'Sencillo',
    false,
    'Valentina Herrera'
  );

