import { useState, useEffect, useMemo } from "react";
import useAuth from "../../hooks/useAuth";
import {
  Card,
  Spinner,
  EmptyState,
  Badge,
  Button,
  Modal,
  SearchInput,
} from "../../components/ui";
import {
  actividadesAlumno,
  turnosAlumno,
  inscripciones,
} from "../../services/alumnoApi";
import type { Actividad, Turno } from "../../services/adminApi";
import type { TurnoDetail } from "../../services/profesorApi";

const DIAS_SEMANA: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const DIAS_ORDEN: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default function AlumnoActividades() {
  const { user } = useAuth();

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal: activity detail with shifts
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);
  const [turnosActividad, setTurnosActividad] = useState<TurnoDetail[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [inscribiendo, setInscribiendo] = useState<number | null>(null);
  const [inscripcionMsg, setInscripcionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchActividades() {
      setLoading(true);
      setError(null);
      try {
        const res = await actividadesAlumno.list();
        setActividades(res.data.items.filter((a) => a.activa));
      } catch {
        setError("No se pudieron cargar las actividades.");
      } finally {
        setLoading(false);
      }
    }
    fetchActividades();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return actividades;
    const q = search.toLowerCase();
    return actividades.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        (a.descripcion ?? "").toLowerCase().includes(q),
    );
  }, [actividades, search]);

  async function openActividadDetail(actividad: Actividad) {
    setSelectedActividad(actividad);
    setTurnosActividad([]);
    setInscripcionMsg(null);
    setLoadingTurnos(true);

    try {
      const res = await turnosAlumno.list({ actividad_id: actividad.id });
      const activeTurnos = res.data.items.filter((t) => t.activo);
      const details = await Promise.all(
        activeTurnos.map((t) => turnosAlumno.getDetail(t.id)),
      );
      setTurnosActividad(details.map((d) => d.data));
    } catch {
      setTurnosActividad([]);
    } finally {
      setLoadingTurnos(false);
    }
  }

  async function handleInscribirse(turnoId: number) {
    if (!user) return;
    setInscribiendo(turnoId);
    setInscripcionMsg(null);

    try {
      await inscripciones.crear(turnoId);
      setInscripcionMsg({ type: "success", text: "Te inscribiste correctamente." });

      // Refresh turno details
      const detail = await turnosAlumno.getDetail(turnoId);
      setTurnosActividad((prev) =>
        prev.map((t) => (t.id === turnoId ? detail.data : t)),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "No se pudo completar la inscripción.";
      setInscripcionMsg({ type: "error", text: msg });
    } finally {
      setInscribiendo(null);
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
        <h1 className="text-2xl font-bold text-neutral-900">Actividades</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Explorá las actividades disponibles e inscribite en los turnos
        </p>
      </div>

      {/* Search */}
      <Card padding="sm">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar actividad..."
        />
      </Card>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin actividades"
            description={
              search
                ? "No se encontraron actividades con ese nombre."
                : "No hay actividades disponibles en este momento."
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((actividad) => (
            <Card key={actividad.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-neutral-900">
                    {actividad.nombre}
                  </h3>
                  <Badge variant="primary">{actividad.duracion_min} min</Badge>
                </div>
                {actividad.descripcion && (
                  <p className="mt-2 text-sm text-neutral-500 line-clamp-3">
                    {actividad.descripcion}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                  <UsersIcon className="h-3.5 w-3.5" />
                  <span>Cupo máximo: {actividad.cupo_maximo}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => openActividadDetail(actividad)}
                >
                  Ver turnos disponibles
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Activity detail modal */}
      <Modal
        open={!!selectedActividad}
        onClose={() => setSelectedActividad(null)}
        title={selectedActividad?.nombre ?? ""}
        description={selectedActividad?.descripcion ?? undefined}
        size="lg"
      >
        {inscripcionMsg && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              inscripcionMsg.type === "success"
                ? "bg-success-50 text-success-700 border border-success-200"
                : "bg-danger-50 text-danger-600 border border-danger-200"
            }`}
          >
            {inscripcionMsg.text}
          </div>
        )}

        {loadingTurnos ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : turnosActividad.length === 0 ? (
          <EmptyState
            title="Sin turnos"
            description="Esta actividad no tiene turnos disponibles actualmente."
          />
        ) : (
          <div className="space-y-3">
            {turnosActividad
              .sort(
                (a, b) =>
                  (DIAS_ORDEN[a.dia_semana] ?? 99) - (DIAS_ORDEN[b.dia_semana] ?? 99) ||
                  a.hora_inicio.localeCompare(b.hora_inicio),
              )
              .map((turno) => {
                const lleno = turno.cupo_disponible <= 0;
                return (
                  <div
                    key={turno.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-neutral-900">
                          {DIAS_SEMANA[turno.dia_semana] ?? turno.dia_semana}
                        </span>
                        <span className="text-sm text-neutral-500">
                          {formatTime(turno.hora_inicio)} – {formatTime(turno.hora_fin)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                        {turno.sala && <span>Sala: {turno.sala}</span>}
                        <span>
                          {turno.inscritos}/{turno.cupo_maximo} inscriptos
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {lleno ? (
                        <Badge variant="warning">Lleno</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleInscribirse(turno.id)}
                          loading={inscribiendo === turno.id}
                        >
                          Inscribirme
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
