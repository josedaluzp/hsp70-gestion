import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState, Badge } from "../../components/ui";
import { rutinasAlumnoApi } from "../../services/rutinaApi";
import type { AlumnoRutina } from "../../services/rutinaApi";

export default function AlumnoRutinas() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lista, setLista] = useState<AlumnoRutina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchRutinas();
  }, [user]);

  async function fetchRutinas() {
    setLoading(true);
    setError(null);
    try {
      const res = await rutinasAlumnoApi.list(user!.id);
      setLista(res.data);
    } catch {
      setError("No se pudieron cargar las rutinas.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Tus rutinas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tu plan de entrenamiento personalizado
        </p>
      </div>

      {lista.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <DumbbellIcon className="h-14 w-14 text-neutral-300" />
            }
            title="Todavía no tenés rutinas"
            description="Tu profesor te asignará una rutina de entrenamiento pronto. Cuando lo haga, la vas a ver acá."
          />
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((rutina) => (
            <button
              key={rutina.id}
              type="button"
              onClick={() => navigate(`/alumno/rutinas/${rutina.id}`)}
              className="group cursor-pointer rounded-xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:border-primary-300 hover:shadow-md"
            >
              {/* Icon & badge row */}
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors duration-200 group-hover:bg-primary-100">
                  <ClipboardIcon className="h-5 w-5" />
                </div>
                <Badge variant="primary">
                  {rutina.ejercicio_count}{" "}
                  {rutina.ejercicio_count === 1 ? "ejercicio" : "ejercicios"}
                </Badge>
              </div>

              {/* Name */}
              <h3 className="mt-4 text-base font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors duration-200">
                {rutina.nombre}
              </h3>

              {/* Professor */}
              {rutina.profesor_nombre && (
                <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span>Prof. {rutina.profesor_nombre}</span>
                </div>
              )}

              {/* CTA row */}
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-600 group-hover:text-primary-700 transition-colors duration-200">
                <span>Ver rutina</span>
                <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5h10.5M6.75 16.5h10.5M3.75 10.5h1.5v3h-1.5v-3Zm0 0a1.5 1.5 0 0 1 1.5-1.5h0a1.5 1.5 0 0 1 1.5 1.5M3.75 13.5a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5m10.5-3h1.5v3h-1.5v-3Zm0 0a1.5 1.5 0 0 1 1.5-1.5h0a1.5 1.5 0 0 1 1.5 1.5m-1.5 3a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5M12 7.5v9" />
    </svg>
  );
}
