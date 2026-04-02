import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState } from "../../components/ui";
import { rutinasAlumnoApi } from "../../services/rutinaApi";
import type { AlumnoRutina } from "../../services/rutinaApi";

const GRADIENT_COLORS = [
  { from: "from-indigo-500", to: "to-purple-500" },
  { from: "from-emerald-500", to: "to-green-500" },
  { from: "from-amber-500", to: "to-orange-500" },
  { from: "from-rose-500", to: "to-pink-500" },
  { from: "from-sky-500", to: "to-blue-500" },
];

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Rutinas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Rutinas de entrenamiento asignadas
        </p>
      </div>

      {lista.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin rutinas asignadas"
            description="Aun no tenes rutinas de entrenamiento asignadas."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((rutina, index) => {
            const color = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
            return (
              <button
                key={rutina.id}
                type="button"
                onClick={() => navigate(`/alumno/rutinas/${rutina.id}`)}
                className="flex w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors duration-150 hover:bg-neutral-50 text-left"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color.from} ${color.to}`}
                >
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">
                    {rutina.nombre}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {rutina.ejercicio_count}{" "}
                    {rutina.ejercicio_count === 1 ? "ejercicio" : "ejercicios"}
                    {rutina.profesor_nombre && ` · Prof. ${rutina.profesor_nombre}`}
                  </p>
                </div>
                <svg
                  className="h-5 w-5 shrink-0 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
