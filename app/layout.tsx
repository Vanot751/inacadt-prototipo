import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INACADT",
  description: "Plataforma de clasificados para intercambio de conocimiento universitario",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-gray-100 text-gray-900">{children}</body>
    </html>
  );
}
