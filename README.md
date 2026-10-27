# INACADT - Prototipo Evaluación 3

Prototipo web con Next.js (App Router), Tailwind CSS y Supabase para intercambio de conocimiento universitario.

## Requisitos

- Node.js 20+
- Variables de entorno configuradas en `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Flujo MVP implementado

- Login con Supabase Auth.
- Muro privado con tarjetas de publicaciones.
- Sello de profesor visible en publicaciones certificadas.
- Botón **Otorgar Sello** solo para usuarios con rol `Profesor`.
