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
  cambios_pendientes JSONB,
  eliminacion_pendiente BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.publicaciones
  ADD COLUMN IF NOT EXISTS cambios_pendientes JSONB,
  ADD COLUMN IF NOT EXISTS eliminacion_pendiente BOOLEAN NOT NULL DEFAULT FALSE;

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

-- 4. Habilitar Row Level Security (Seguridad OWASP en Base de Datos) y Permisos de Rol
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.publicaciones TO authenticated;

-- Políticas de lectura y escritura para usuarios autenticados
DROP POLICY IF EXISTS "Lectura de usuarios para autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Inserción/Actualización de propio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Lectura de publicaciones del muro" ON public.publicaciones;
DROP POLICY IF EXISTS "Actualizar Sello de Profesor (RF08)" ON public.publicaciones;
DROP POLICY IF EXISTS "Crear publicaciones en el muro (RLS estricto auth.uid() = autor_id)" ON public.publicaciones;
DROP POLICY IF EXISTS "Actualizar publicaciones según rol y autoría" ON public.publicaciones;
DROP POLICY IF EXISTS "Eliminar publicaciones según rol y autoría" ON public.publicaciones;

CREATE POLICY "Lectura de usuarios para autenticados"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inserción/Actualización de propio perfil"
  ON public.usuarios FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Lectura de publicaciones del muro"
  ON public.publicaciones FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.es_profesor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol = 'Profesor'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validar_cambios_publicacion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.posee_sello_profesor
     AND NOT public.es_profesor()
     AND (TG_OP = 'DELETE'
       OR NEW.titulo IS DISTINCT FROM OLD.titulo
       OR NEW.contenido IS DISTINCT FROM OLD.contenido
       OR NEW.categoria IS DISTINCT FROM OLD.categoria
       OR NEW.complejidad IS DISTINCT FROM OLD.complejidad
       OR NEW.posee_sello_profesor IS DISTINCT FROM OLD.posee_sello_profesor) THEN
    RAISE EXCEPTION 'Una publicación sellada requiere aprobación de un profesor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validar_cambios_publicacion ON public.publicaciones;
CREATE TRIGGER validar_cambios_publicacion
  BEFORE UPDATE OR DELETE ON public.publicaciones
  FOR EACH ROW EXECUTE FUNCTION public.validar_cambios_publicacion();

CREATE POLICY "Crear publicaciones propias"
  ON public.publicaciones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Actualizar publicaciones según rol y autoría"
  ON public.publicaciones FOR UPDATE
  TO authenticated
  USING (public.es_profesor() OR auth.uid() = autor_id)
  WITH CHECK (public.es_profesor() OR auth.uid() = autor_id);

CREATE POLICY "Eliminar publicaciones según rol y autoría"
  ON public.publicaciones FOR DELETE
  TO authenticated
  USING (public.es_profesor() OR auth.uid() = autor_id);

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
