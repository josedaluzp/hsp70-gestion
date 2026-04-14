import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, Badge, Button } from "../../components/ui";
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

  const actividadesUnicas = useMemo(
    () => new Set(turnosHoy.map((t) => t.actividad_id)).size,
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

  const primerNombre = user?.nombre?.split(" ")[0] ?? user?.nombre ?? "";

  return (
    <div className="space-y-10">
      {/* Welcome header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Hola, {primerNombre}
        </h1>
        <p className="mt-2 text-primary-100 text-base">
          {hoyLabel} &mdash; Este es el resumen de tus clases de hoy
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Clases hoy"
          value={turnosHoy.length}
          icon={<ClockIcon className="h-6 w-6" />}
          color="primary"
        />
        <StatCard
          label="Alumnos en tus clases"
          value={totalAlumnos}
          icon={<UsersIcon className="h-6 w-6" />}
          color="success"
        />
        <StatCard
          label="Actividades distintas"
          value={actividadesUnicas}
          icon={<ActivityIcon className="h-6 w-6" />}
          color="warning"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <QuickAction
            label="Mis Turnos"
            description="Ver todos tus turnos asignados"
            onClick={() => navigate("/profesor/turnos")}
            icon={<CalendarIcon className="h-6 w-6" />}
            color="primary"
          />
          <QuickAction
            label="Tomar Asistencia"
            description="Registrar presencia en un turno"
            onClick={() => navigate("/profesor/asistencia")}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="success"
          />
          <QuickAction
            label="Evaluaciones"
            description="Evaluar alumnos y ver historial"
            onClick={() => navigate("/profesor/evaluaciones")}
            icon={<ClipboardIcon className="h-6 w-6" />}
            color="warning"
          />
        </div>
      </div>

      {/* Today's classes */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Tus clases de hoy
        </h2>

        {turnosHoy.length === 0 ? (
          <Card className="border-dashed">
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <CalendarIcon className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="font-medium text-neutral-700">No tenés clases hoy</p>
              <p className="mt-1 text-sm text-neutral-500">
                No hay turnos asignados para {hoyLabel.toLowerCase()}.
              </p>
              <Button
                variant="outline"
                size="md"
                className="mt-4 cursor-pointer"
                onClick={() => navigate("/profesor/turnos")}
              >
                <CalendarIcon className="h-4 w-4" />
                Ver todos mis turnos
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {turnosHoy
              .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
              .map((turno) => {
                const actividad = actividadMap.get(turno.actividad_id);
                const ocupacion = turno.cupo_maximo > 0
                  ? Math.round((turno.inscritos / turno.cupo_maximo) * 100)
                  : 0;
                const badgeVariant =
                  ocupacion >= 90 ? "danger" : turno.inscritos > 0 ? "success" : "default";

                return (
                  <Card
                    key={turno.id}
                    className="flex flex-col justify-between transition-all duration-200 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-neutral-900">
                          {actividad?.nombre ?? `Actividad #${turno.actividad_id}`}
                        </h3>
                        <Badge variant={badgeVariant}>
                          {turno.inscritos}/{turno.cupo_maximo}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-neutral-600">
                        <div className="flex items-center gap-2.5">
                          <ClockIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                          <span className="font-medium">
                            {formatTime(turno.hora_inicio)} – {formatTime(turno.hora_fin)}
                          </span>
                        </div>
                        {turno.sala && (
                          <div className="flex items-center gap-2.5">
                            <MapPinIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                            <span>{turno.sala}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5">
                          <UsersIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                          <span>
                            {turno.inscritos} alumno{turno.inscritos !== 1 ? "s" : ""} inscrito{turno.inscritos !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-neutral-100 pt-4">
                      <Button
                        size="sm"
                        className="w-full cursor-pointer"
                        onClick={() =>
                          navigate(`/profesor/asistencia?turno=${turno.id}`)
                        }
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Tomar asistencia
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color = "primary",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "primary" | "success" | "warning";
}) {
  const styles = {
    primary: {
      bg: "bg-primary-50 border-primary-100",
      icon: "bg-primary-100 text-primary-600",
      value: "text-primary-700",
    },
    success: {
      bg: "bg-success-50 border-success-100",
      icon: "bg-success-100 text-success-600",
      value: "text-success-700",
    },
    warning: {
      bg: "bg-warning-50 border-warning-100",
      icon: "bg-warning-100 text-warning-600",
      value: "text-warning-700",
    },
  };

  const s = styles[color];

  return (
    <div className={`flex items-center gap-4 rounded-xl border p-5 ${s.bg}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.icon}`}>
        {icon}
      </div>
      <div>
        <p className={`text-3xl font-bold ${s.value}`}>{value}</p>
        <p className="text-sm font-medium text-neutral-600">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  label,
  description,
  onClick,
  icon,
  color = "primary",
}: {
  label: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
  color?: "primary" | "success" | "warning";
}) {
  const iconStyles = {
    primary: "bg-primary-50 text-primary-600 group-hover:bg-primary-100",
    success: "bg-success-50 text-success-600 group-hover:bg-success-100",
    warning: "bg-warning-50 text-warning-600 group-hover:bg-warning-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-center transition-all duration-200 hover:border-primary-300 hover:shadow-md cursor-pointer sm:flex-row sm:items-start sm:text-left sm:gap-4"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${iconStyles[color]}`}>
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

function UsersIcon({ className }: { className?: string }) {
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
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
