import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState, Badge, Button } from "../../components/ui";
import {
  inscripciones,
  notificacionesAlumno,
} from "../../services/alumnoApi";
import type { MiInscripcion } from "../../services/alumnoApi";
import type { Notificacion } from "../../services/adminApi";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AlumnoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [misInscripciones, setMisInscripciones] = useState<MiInscripcion[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoy = DIAS_JS_TO_API[new Date().getDay()];

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [inscRes, notifRes] = await Promise.all([
          inscripciones.list(user!.id, { solo_activas: true, page_size: 100 }),
          notificacionesAlumno.list({ page_size: 5 }),
        ]);
        setMisInscripciones(inscRes.data.items);
        setNotificaciones(notifRes.data.items);
      } catch {
        setError("No se pudieron cargar los datos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const turnosHoy = misInscripciones.filter(
    (i) => i.dia_semana === hoy && i.estado === "activa",
  );

  const totalActivas = misInscripciones.filter(
    (i) => i.estado === "activa",
  ).length;

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
          Hola, {user?.nombre}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {DIAS_SEMANA[hoy]} — Tu resumen del día
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
          label="Inscripciones activas"
          value={totalActivas}
          color="accent"
        />
        <StatCard
          label="Actividades"
          value={new Set(misInscripciones.filter((i) => i.estado === "activa").map((i) => i.nombre_actividad)).size}
          color="default"
        />
      </div>

      {/* Today's shifts */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Tus turnos de hoy
        </h2>

        {turnosHoy.length === 0 ? (
          <Card>
            <EmptyState
              title="Sin turnos hoy"
              description={`No tenés turnos para ${DIAS_SEMANA[hoy]?.toLowerCase()}.`}
              action={
                <Button
                  variant="outline"
                  onClick={() => navigate("/alumno/actividades")}
                >
                  Explorar actividades
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {turnosHoy
              .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""))
              .map((insc) => (
                <Card key={insc.id} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-neutral-900">
                        {insc.nombre_actividad ?? "Actividad"}
                      </h3>
                      <Badge variant="success">Inscripto</Badge>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-neutral-500">
                      {insc.hora_inicio && insc.hora_fin && (
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 shrink-0" />
                          <span>
                            {formatTime(insc.hora_inicio)} – {formatTime(insc.hora_fin)}
                          </span>
                        </div>
                      )}
                      {insc.sala && (
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="h-4 w-4 shrink-0" />
                          <span>{insc.sala}</span>
                        </div>
                      )}
                      {insc.nombre_profesor && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 shrink-0" />
                          <span>{insc.nombre_profesor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Recent notifications */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Notificaciones recientes
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/notificaciones")}
          >
            Ver todas
          </Button>
        </div>

        {notificaciones.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-sm text-neutral-500">
              No hay notificaciones recientes.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notificaciones.map((n) => (
              <Card key={n.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      n.leida ? "bg-neutral-300" : "bg-primary-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.leida ? "text-neutral-500" : "text-neutral-900 font-medium"}`}>
                      {n.mensaje}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {formatDate(n.fecha)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            label="Actividades"
            description="Explorar y anotarte"
            onClick={() => navigate("/alumno/actividades")}
            icon={<ActivityIcon className="h-5 w-5" />}
          />
          <QuickAction
            label="Mis Inscripciones"
            description="Ver tus turnos"
            onClick={() => navigate("/alumno/inscripciones")}
            icon={<CalendarIcon className="h-5 w-5" />}
          />
          <QuickAction
            label="Mis Pagos"
            description="Historial y membresía"
            onClick={() => navigate("/alumno/pagos")}
            icon={<CreditCardIcon className="h-5 w-5" />}
          />
          <QuickAction
            label="Mi Perfil"
            description="Datos y evaluaciones"
            onClick={() => navigate("/alumno/perfil")}
            icon={<UserIcon className="h-5 w-5" />}
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
  color = "default",
}: {
  label: string;
  value: number;
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
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${valueColor[color]}`}>{value}</p>
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
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

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}
