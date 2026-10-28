import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'INACADT | Muro Universitario de Intercambio de Conocimiento',
  description:
    'Plataforma web tipo muro de clasificados para intercambio de conocimiento académico universitario con validación docente (Sello de Profesor). Cumple con WCAG 2.1 AA y seguridad OWASP.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {/* Enlace de salto directo para lectores de pantalla y teclado (WCAG 2.1 AA) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-red-900 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
