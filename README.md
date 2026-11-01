# INACADT

Prototipo de una plataforma universitaria para compartir conocimiento académico, gestionar publicaciones y diferenciar perfiles con roles docentes/alumnos.

El proyecto está desarrollado con Next.js 16, React 19, TypeScript y Tailwind CSS, y soporta tanto una integración real con Supabase como un modo de demostración local cuando no hay configuración de entorno disponible.

## Estado actual del proyecto

La aplicación ya incluye:

- flujo de autenticación con login y registro en Supabase Auth
- autenticación local por demo para desarrollo sin credenciales reales
- protección de rutas privadas para /dashboard
- muro de publicaciones con búsqueda, filtros y carga de datos de ejemplo
- creación de publicaciones desde la UI
- CRUD completo de publicaciones con controles de autoría
- flujo de cambios pendientes para publicaciones selladas, con aprobación docente
- marca de sello de profesor y validación de permisos por rol
- sanitización y validación de entrada para mitigar XSS e inyección
- estilos institucionales y accesibilidad básica en la interfaz

## Stack tecnológico

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Supabase JS + Supabase SSR
- lucide-react
- ESLint + Next.js lint rules

## Scripts disponibles

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Estructura principal

```text
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── publicaciones/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           ├── route.ts
│   │   │           ├── aprobacion/
│   │   │           │   └── route.ts
│   │   │           └── sello/
│   │   │               └── route.ts
│   │   ├── auth/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   └── dashboard/
│   │       ├── MuroDashboard.tsx
│   │       ├── Navbar.tsx
│   │       ├── NuevaPublicacionModal.tsx
│   │       └── PublicacionCard.tsx
│   ├── lib/
│   │   ├── security/
│   │   │   └── validation.ts
│   │   └── supabase/
│   │       ├── actions.ts
│   │       ├── client.ts
│   │       ├── mockData.ts
│   │       ├── server-actions.ts
│   │       └── server.ts
│   ├── proxy.ts
│   └── types/
│       └── inacadt.ts
├── supabase/
│   └── schema.sql
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
└── README.md
```

## Funcionalidades implementadas

### Autenticación

- login con correo y contraseña
- soporte a Supabase Auth cuando las variables de entorno están configuradas
- fallback de usuarios demo para ejecutarse en local sin backend
- sesión persistida en cookies y almacenamiento local para la validación de acceso

### Muro de publicaciones

- listado de publicaciones con título, contenido, categoría y complejidad
- filtro por texto, categoría y nivel de complejidad
- opción para mostrar solo publicaciones con sello de profesor
- carga de datos iniciales de ejemplo si la base aún está vacía
- creación de nuevas publicaciones desde el frontend

### Roles y permisos

- reconocimiento de usuario con rol Profesor o Estudiante
- visualización de estado del usuario en la barra superior
- los profesores pueden crear, leer, editar y eliminar cualquier publicación
- los estudiantes solo pueden editar o eliminar publicaciones propias
- una edición o eliminación estudiantil sobre una publicación sellada queda pendiente de aprobación docente
- acción para otorgar sello de profesor a una publicación si el usuario autenticado tiene permisos

### Seguridad

- validación de credenciales y contenido de las publicaciones
- sanitización de text input antes de guardar o mostrar
- protección de rutas privadas con redirección a /login
- cabeceras HTTP de seguridad en el proxy

## Configuración de entorno

Crear un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

Si estas variables no existen, la aplicación sigue funcionando en modo demostración local con usuarios de ejemplo.

## Base de datos

El esquema SQL esperado para Supabase está en `supabase/schema.sql`. Si la tabla
`publicaciones` ya existía antes de incorporar el flujo de aprobación, deben
estar aplicadas en Supabase las columnas `cambios_pendientes` y
`eliminacion_pendiente`.

Incluye tablas para:

- usuarios
- publicaciones

La API expone `GET/POST /api/publicaciones`, `GET/PATCH/PUT/DELETE /api/publicaciones/:id` y `PATCH /api/publicaciones/:id/aprobacion`. Las políticas RLS y el trigger `validar_cambios_publicacion` impiden que un estudiante modifique directamente el contenido visible de una publicación sellada.

Se recomienda ejecutar ese script en el SQL Editor de Supabase antes de usar la app en modo real con autenticación y persistencia de datos.

## Ejecución local

1. Instala dependencias:

```bash
npm install
```

2. Inicia el proyecto:

```bash
npm run dev
```

3. Abre la aplicación en:

```text
http://localhost:3000
```

## Rutas relevantes

- `/login`: pantalla principal de acceso
- `/dashboard`: muro protegido de publicaciones
- `/`: redirección hacia `/login`

## Notas del proyecto

Este es un prototipo funcional para demostrar el flujo principal de una red académica universitaria: autenticación, publicación, filtrado, validación de roles y seguridad básica de acceso.

La lógica de negocio y las interfaces están preparadas para ampliarse con mejor persistencia real, APIs más avanzadas y flujo completo de administración académica.
