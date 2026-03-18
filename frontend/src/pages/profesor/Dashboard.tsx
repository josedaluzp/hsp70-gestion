import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState, Badge, Button } from "../../components/ui";
import { misTurnos, actividadesRef } from "../../services/profesorApi";
import type { TurnoDetail } from "../../services/profesorApi";
import type { Actividad } from "../../services/adminApi";

const DIAS_SEMANA: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const DIAS_JS_TO_API: Record<number, string> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado",
};

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default function ProfesorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [turnosHoy, setTurnosHoy] = useState<TurnoDetail[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoy = DIAS_JS_TO_API[new Date().getDay()];
  const hoyLabel = DIAS_SEMANA[hoy] ?? hoy;

  const actividadMap = useMemo(() => {
    const map = new Map<number, Actividad>();
    actividades.forEach((a) => map.set(a.id, a));
    return map;
  }, [actividades]);

  const totalAlumnos = useMemo(
    () => turnosHoy.reduce((sum, t) => sum + t.inscritos, 0),
    [turnosHoy],
  );

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [turnosRes, actRes] = await Promise.all([
          misTurnos.list(user!.id),
          actividadesRef.list(),
        ]);

        setActividades(actRes.data.items);

        const turnosDelDia = turnosRes.data.items.filter(
          (t) => t.dia_semana === hoy,
        );

        const details = await Promise.all(
          turnosDelDia.map((t) => misTurnos.getDetail(t.id)),
        );
        setTurnosHoy(details.map((d) => d.data));
      } catch {
        setError("No se pudieron cargar los datos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, hoy]);

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
        <h1 className="text-2xl font-bold text-neutral-900">
          Buen día, {user?.nombre}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {hoyLabel} — Tus turnos de hoy y accesos rápidos
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Turnos hoy"
          value={turnosHoy.length}
          color="primary"
        />
        <StatCard
          label="Alumnos esperados"
          value={totalAlumnos}
          color="accent"
        />
        <StatCard
          label="Turnos totales"
          value={turnosHoy.length}
          sublabel="hoy"
          color="default"
        />
      </div>

      {/* Turnos de hoy */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Turnos de hoy
        </h2>

        {turnosHoy.length === 0 ? (
          <Card>
            <EmptyState
              title="Sin turnos hoy"
              description={`No tenés turnos asignados para ${hoyLabel.toLowerCase()}.`}
              action={
                <Button
                  variant="outline"
                  onClick={() => navigate("/profesor/turnos")}
                >
                  Ver todos mis turnos
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {turnosHoy
              .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
              .map((turno) => {
                const actividad = actividadMap.get(turno.actividad_id);
                return (
                  <Card key={turno.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-neutral-900">
                          {actividad?.nombre ?? `Actividad #${turno.actividad_id}`}
                        </h3>
                        <Badge variant={turno.inscritos > 0 ? "primary" : "default"}>
                          {turno.inscritos}/{turno.cupo_maximo}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1.5 text-sm text-neutral-500">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 shrink-0" />
                          <span>
                            {formatTime(turno.hora_inicio)} – {formatTime(turno.hora_fin)}
                          </span>
                        </div>
                        {turno.sala && (
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="h-4 w-4 shrink-0" />
                            <span>{turno.sala}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <UsersSmIcon className="h-4 w-4 shrink-0" />
                          <span>
                            {turno.inscritos} alumno{turno.inscritos !== 1 ? "s" : ""} inscrito{turno.inscritos !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-neutral-100">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          navigate(`/profesor/asistencia?turno=${turno.id}`)
                        }
                      >
                        Tomar asistencia
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction
            label="Mis Turnos"
            description="Ver todos tus turnos asignados"
            onClick={() => navigate("/profesor/turnos")}
            icon={<CalendarIcon className="h-5 w-5" />}
          />
          <QuickAction
            label="Tomar Asistencia"
            description="Registrar asistencia de un turno"
            onClick={() => navigate("/profesor/asistencia")}
            icon={<ChecklistIcon className="h-5 w-5" />}
          />
          <QuickAction
            label="Evaluaciones"
            description="Evaluar alumnos y ver historial"
            onClick={() => navigate("/profesor/evaluaciones")}
            icon={<ClipboardIcon className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sublabel,
  color = "default",
}: {
  label: string;
  value: number;
  sublabel?: string;
  color?: "primary" | "accent" | "default";
}) {
  const colorClasses = {
    primary: "border-primary-200 bg-primary-50",
    accent: "border-accent-200 bg-accent-50",
    default: "border-neutral-200 bg-white",
  };
  const valueColor = {
    primary: "text-primary-700",
    accent: "text-accent-700",
    default: "text-neutral-900",
  };

  return (
    <div
      className={`rounded-xl border p-5 ${colorClasses[color]}`}
    >
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${valueColor[color]}`}>
        {value}
        {sublabel && (
          <span className="ml-1 text-sm font-normal text-neutral-400">
            {sublabel}
          </span>
        )}
      </p>
    </div>
  );
}

function QuickAction({
  label,
  description,
  onClick,
  icon,
}: {
  label: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 text-left transition-all duration-150 hover:border-primary-300 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-neutral-900">{label}</p>
        <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
      </div>
    </button>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function UsersSmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}
