# INACADT — Muro Universitario de Intercambio de Conocimiento

Prototipo de **INACADT** para la **Evaluación 3 de Ingeniería Informática**, construido con **Next.js (App Router + TypeScript)**, **Tailwind CSS** y **Supabase (`@supabase/supabase-js`)**.

---

## Cumplimiento de Requerimientos

| Código | Requerimiento | Implementación en el Proyecto |
| :--- | :--- | :--- |
| **RF01** | **Autenticación** | Pantalla de inicio de sesión y registro conectada a **Supabase Auth** (`src/components/auth/LoginForm.tsx` y `src/lib/supabase/actions.ts`). |
| **RF03 / RF04** | **Muro de Publicaciones** | Vista principal (`/dashboard`) que lista tarjetas responsivas con **Título**, **Contenido**, **Categoría**, **Complejidad** (`Sencillo`, `Avanzado`, `Asistido`) y distintivo visual para el **Sello de Profesor**. |
| **RF08** | **Otorgar Sello (Crítico)** | Si el usuario autenticado posee el rol `'Profesor'` en la tabla `usuarios` de Supabase, se habilita el botón **"Otorgar Sello"** en cada tarjeta, actualizando `posee_sello_profesor = true` mediante la API (`PATCH /api/publicaciones/[id]/sello`). |
| **RNF03** | **Identidad Visual y WCAG 2.1 AA** | Paleta institucional de alto contraste (`> 8:1` en cabeceras rojo oscuro `#7F1D1D`/`#991B1B` con texto blanco `#FFFFFF`, grises neutros `#0F172A`/`#334155`), navegación por teclado (`:focus-visible`), enlace `Saltar al contenido principal` y atributos ARIA. |
| **OWASP** | **Seguridad y Rutas Privadas** | Validación y sanitización contra inyecciones XSS/SQLi en cliente y servidor (`src/lib/security/validation.ts`), protección de rutas privadas en `src/proxy.ts` y cabeceras HTTP seguras. |

---

## Estructura del Proyecto

```text
src/
├── app/
│   ├── api/
│   │   └── publicaciones/
│   │       ├── route.ts                 # GET y POST de publicaciones
│   │       └── [id]/sello/route.ts      # PATCH/POST para Otorgar Sello (RF08)
│   ├── auth/page.tsx                    # Ruta de autenticación (/auth)
│   ├── login/page.tsx                   # Pantalla principal de Login (RF01)
│   ├── dashboard/page.tsx               # Muro de Publicaciones protegido (RF03/RF04/RF08)
│   ├── globals.css                      # Variables institucionales y foco accesible WCAG AA
│   ├── layout.tsx                       # Layout raíz con soporte de accesibilidad
│   └── page.tsx                         # Redirección segura hacia /login o /dashboard
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx                # Formulario de Login/Registro con validación OWASP
│   └── dashboard/
│       ├── MuroDashboard.tsx            # Vista principal del Muro con filtros y KPIs
│       ├── Navbar.tsx                   # Barra institucional con indicador de Rol
│       ├── NuevaPublicacionModal.tsx    # Modal para publicar clasificados (RF03)
│       └── PublicacionCard.tsx          # Tarjeta de publicación y botón "Otorgar Sello" (RF08)
├── lib/
│   ├── security/
│   │   └── validation.ts                # Reglas OWASP contra XSS y SQL Injection
│   └── supabase/
│       ├── actions.ts                   # Acciones de Auth, lectura de rol y publicaciones
│       ├── client.ts                    # Inicialización de @supabase/supabase-js
│       └── mockData.ts                  # Datos semilla de respaldo para demostración
├── proxy.ts                             # Protección de rutas privadas (/dashboard) y headers OWASP
└── types/
    └── inacadt.ts                       # Contratos TypeScript del dominio INACADT
supabase/
└── schema.sql                           # Script SQL para crear tablas 'usuarios' y 'publicaciones'
```

---

## Configuración e Instalación Local

1. **Configurar variables de entorno**:
   Copia `.env.example` a `.env.local` e ingresa las credenciales de tu proyecto Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```

2. **Inicializar Base de Datos en Supabase**:
   Ejecuta el contenido de `supabase/schema.sql` en el **SQL Editor** de tu panel de Supabase para crear las tablas `usuarios` y `publicaciones`.

3. **Ejecutar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre `http://localhost:3000` en tu navegador.
