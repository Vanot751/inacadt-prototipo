"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Publicacion = {
  id: string;
  titulo: string;
  contenido: string;
  categoria: string;
  complejidad: "Sencillo" | "Avanzado" | "Asistido";
  posee_sello_profesor: boolean;
};

type RolUsuario = "Profesor" | "Estudiante" | string;

export function DashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [rol, setRol] = useState<RolUsuario>("Estudiante");
  const [error, setError] = useState<string | null>(null);

  const isProfesor = rol.toLowerCase() === "profesor";

  useEffect(() => {
    const load = async () => {
      let supabase;
      try {
        supabase = getSupabaseBrowserClient();
      } catch {
        setError("Faltan variables de configuración de Supabase.");
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/");
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", session.user.id)
        .maybeSingle();

      const usuario = usuarioData as { rol?: string } | null;

      if (!usuarioError && usuario?.rol) {
        setRol(usuario.rol as RolUsuario);
      }

      const { data, error: publicacionesError } = await supabase
        .from("publicaciones")
        .select("id,titulo,contenido,categoria,complejidad,posee_sello_profesor")
        .order("id", { ascending: false });

      if (publicacionesError) {
        setError("No se pudieron cargar las publicaciones.");
        setLoading(false);
        return;
      }

      setPublicaciones((data ?? []) as Publicacion[]);
      setLoading(false);
    };

    void load();
  }, [router]);

  const otorgarSello = async (id: string) => {
    setError(null);
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setError("Faltan variables de configuración de Supabase.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    const response = await fetch(`/api/publicaciones/${id}/sello`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: session.access_token }),
    });

    if (!response.ok) {
      setError("No fue posible otorgar el sello.");
      return;
    }

    setPublicaciones((current) =>
      current.map((publicacion) =>
        publicacion.id === id
          ? { ...publicacion, posee_sello_profesor: true }
          : publicacion,
      ),
    );
  };

  const cerrarSesion = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // noop
    }
    router.replace("/");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-700">
        Cargando muro...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-300 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Muro INACADT</h1>
            <p className="text-sm text-gray-600">Rol actual: {rol}</p>
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {publicaciones.map((publicacion) => (
          <article key={publicacion.id} className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{publicacion.titulo}</h2>
              {publicacion.posee_sello_profesor ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-900 px-2 py-1 text-xs font-semibold text-white">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Sello de Profesor
                </span>
              ) : null}
            </div>

            <p className="mb-3 text-sm text-gray-700">{publicacion.contenido}</p>
            <ul className="mb-4 space-y-1 text-sm text-gray-700">
              <li>
                <strong>Categoría:</strong> {publicacion.categoria}
              </li>
              <li>
                <strong>Complejidad:</strong> {publicacion.complejidad}
              </li>
            </ul>

            {isProfesor && !publicacion.posee_sello_profesor ? (
              <button
                type="button"
                onClick={() => void otorgarSello(publicacion.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-900 px-3 py-2 text-sm font-semibold text-white hover:bg-red-950"
              >
                <GraduationCap className="h-4 w-4" />
                Otorgar Sello
              </button>
            ) : null}
          </article>
        ))}
      </section>

      {error ? (
        <p className="mx-auto mb-8 w-full max-w-5xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      ) : null}
    </main>
  );
}
