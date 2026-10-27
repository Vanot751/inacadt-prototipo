import Link from "next/link";
import { BookCopy } from "lucide-react";

import { LoginForm } from "./auth/login-form";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-red-900/10 p-2 text-red-900" aria-hidden="true">
            <BookCopy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">INACADT</h1>
            <p className="text-sm text-gray-600">Intercambio de conocimiento universitario</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-gray-700">
          Inicia sesión para acceder al muro de publicaciones.
        </p>

        <LoginForm />

        <p className="mt-6 text-xs text-gray-500">
          Al continuar aceptas un uso responsable y seguro de la plataforma.
        </p>

        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-red-900 underline-offset-2 hover:underline"
        >
          Ir al muro
        </Link>
      </section>
    </main>
  );
}
