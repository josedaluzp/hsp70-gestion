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
import type { MiInscripcion } from "../../services/alumnoApi";
import type { Actividad } from "../../services/adminApi";
import type { TurnoDetail } from "../../services/profesorApi";

// ─── Constants ───────────────────────────────────────────────────────────────

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

const ESTADO_BADGE: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  activa: { label: "Activa", variant: "success" },
  cancelada: { label: "Cancelada", variant: "danger" },
  lista_espera: { label: "Lista de espera", variant: "warning" },
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function MisClases() {
  const { user } = useAuth();

  // ── Shared loading state ──────────────────────────────────────────────────
  const [loadingInscripciones, setLoadingInscripciones] = useState(true);
  const [loadingActividades, setLoadingActividades] = useState(true);
  const [errorInscripciones, setErrorInscripciones] = useState<string | null>(null);
  const [errorActividades, setErrorActividades] = useState<string | null>(null);

  // ── Section 1: Mis clases inscriptas ─────────────────────────────────────
  const [lista, setLista] = useState<MiInscripcion[]>([]);
  const [showCanceladas, setShowCanceladas] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MiInscripcion | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Section 2: Clases disponibles ────────────────────────────────────────
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [search, setSearch] = useState("");
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);
  const [turnosActividad, setTurnosActividad] = useState<TurnoDetail[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [inscribiendo, setInscribiendo] = useState<number | null>(null);
  const [inscripcionMsg, setInscripcionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Initial parallel fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchInscripciones();
    fetchActividades();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch inscripciones when the "show cancelled" toggle changes
  useEffect(() => {
    if (!user) return;
    fetchInscripciones();
  }, [showCanceladas]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInscripciones() {
    setLoadingInscripciones(true);
    setErrorInscripciones(null);
    try {
      const res = await inscripciones.list(user!.id, {
        solo_activas: !showCanceladas,
        page_size: 100,
      });
      setLista(res.data.items);
    } catch {
      setErrorInscripciones("No se pudieron cargar las inscripciones.");
    } finally {
      setLoadingInscripciones(false);
    }
  }

  async function fetchActividades() {
    setLoadingActividades(true);
    setErrorActividades(null);
    try {
      const res = await actividadesAlumno.list();
      setActividades(res.data.items.filter((a) => a.activa));
    } catch {
      setErrorActividades("No se pudieron cargar las actividades.");
    } finally {
      setLoadingActividades(false);
    }
  }

  // ── Cancel inscripción ────────────────────────────────────────────────────
  async function handleCancelar() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelMsg(null);
    try {
      await inscripciones.cancelar(cancelTarget.id);
      setCancelMsg({ type: "success", text: "Inscripción cancelada correctamente." });
      setCancelTarget(null);
      fetchInscripciones();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "No se pudo cancelar la inscripción.";
      setCancelMsg({ type: "error", text: msg });
    } finally {
      setCancelling(false);
    }
  }

  // ── Open activity detail modal ────────────────────────────────────────────
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

  // ── Inscribirse en un turno ───────────────────────────────────────────────
  async function handleInscribirse(turnoId: number) {
    if (!user) return;
    setInscribiendo(turnoId);
    setInscripcionMsg(null);
    try {
      await inscripciones.crear(turnoId);
      setInscripcionMsg({ type: "success", text: "Te inscribiste correctamente." });
      // Refresh turno details and inscripciones list in parallel
      const [detail] = await Promise.all([
        turnosAlumno.getDetail(turnoId),
        fetchInscripciones(),
      ]);
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

  // ── Filtered activities ───────────────────────────────────────────────────
  const filteredActividades = useMemo(() => {
    if (!search.trim()) return actividades;
    const q = search.toLowerCase();
    return actividades.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        (a.descripcion ?? "").toLowerCase().includes(q),
    );
  }, [actividades, search]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Clases</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gestioná tus clases e inscribite en nuevas
        </p>
      </div>

      {/* ── Section 1: Mis clases inscriptas ─────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Mis clases inscriptas
          </h2>
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCanceladas}
              onChange={(e) => setShowCanceladas(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            Mostrar canceladas
          </label>
        </div>

        {cancelMsg && (
          <div
            className={`rounded-lg p-3 text-sm ${
              cancelMsg.type === "success"
                ? "bg-success-50 text-success-700 border border-success-200"
                : "bg-danger-50 text-danger-600 border border-danger-200"
            }`}
          >
            {cancelMsg.text}
          </div>
        )}

        {loadingInscripciones ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : errorInscripciones ? (
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-center text-danger-600">
            {errorInscripciones}
          </div>
        ) : lista.length === 0 ? (
          <Card>
            <EmptyState
              title="No tenés clases inscriptas todavía"
              description={
                showCanceladas
                  ? "No tenés inscripciones registradas."
                  : "Explorá las clases disponibles y anotate en la que más te guste."
              }
            />
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Card padding="none">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50">
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">
                          Actividad
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">
                          Día
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">
                          Horario
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">
                          Sala
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">
                          Estado
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">
                          Inscripto el
                        </th>
                        <th className="px-5 py-3 text-right font-medium text-neutral-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {lista.map((insc) => {
                        const estado = ESTADO_BADGE[insc.estado] ?? {
                          label: insc.estado,
                          variant: "default" as const,
                        };
                        return (
                          <tr
                            key={insc.id}
                            className="hover:bg-neutral-50/50 transition-colors"
                          >
                            <td className="px-5 py-4 font-medium text-neutral-900">
                              {insc.nombre_actividad ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-neutral-600">
                              {DIAS_SEMANA[insc.dia_semana ?? ""] ?? insc.dia_semana ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-neutral-600">
                              {insc.hora_inicio && insc.hora_fin
                                ? `${formatTime(insc.hora_inicio)} – ${formatTime(insc.hora_fin)}`
                                : "—"}
                            </td>
                            <td className="px-5 py-4 text-neutral-500">
                              {insc.sala ?? "—"}
                            </td>
                            <td className="px-5 py-4">
                              <Badge variant={estado.variant}>{estado.label}</Badge>
                            </td>
                            <td className="px-5 py-4 text-neutral-500">
                              {formatDate(insc.fecha_inscripcion)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {insc.estado === "activa" && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    setCancelMsg(null);
                                    setCancelTarget(insc);
                                  }}
                                >
                                  Cancelar
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {lista.map((insc) => {
                const estado = ESTADO_BADGE[insc.estado] ?? {
                  label: insc.estado,
                  variant: "default" as const,
                };
                return (
                  <Card key={insc.id}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-neutral-900">
                        {insc.nombre_actividad ?? "—"}
                      </h3>
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-neutral-500">
                      <p>
                        {DIAS_SEMANA[insc.dia_semana ?? ""] ?? "—"}
                        {insc.hora_inicio && insc.hora_fin
                          ? ` · ${formatTime(insc.hora_inicio)} – ${formatTime(insc.hora_fin)}`
                          : ""}
                      </p>
                      {insc.sala && <p>Sala: {insc.sala}</p>}
                      <p>Inscripto el {formatDate(insc.fecha_inscripcion)}</p>
                    </div>
                    {insc.estado === "activa" && (
                      <div className="mt-3 pt-3 border-t border-neutral-100">
                        <Button
                          size="sm"
                          variant="danger"
                          className="w-full"
                          onClick={() => {
                            setCancelMsg(null);
                            setCancelTarget(insc);
                          }}
                        >
                          Cancelar inscripción
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ── Section 2: Clases disponibles ────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          Clases disponibles
        </h2>

        <Card padding="sm">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar actividad..."
          />
        </Card>

        {loadingActividades ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : errorActividades ? (
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-center text-danger-600">
            {errorActividades}
          </div>
        ) : filteredActividades.length === 0 ? (
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
            {filteredActividades.map((actividad) => (
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
      </section>

      {/* ── Cancel confirmation modal ─────────────────────────────────────── */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar inscripción"
        description={`¿Estás seguro de que querés cancelar tu inscripción a ${cancelTarget?.nombre_actividad ?? "este turno"}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              No, mantener
            </Button>
            <Button variant="danger" onClick={handleCancelar} loading={cancelling}>
              Sí, cancelar
            </Button>
          </>
        }
      >
        <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
          <p>
            <strong>Actividad:</strong> {cancelTarget?.nombre_actividad}
          </p>
          <p>
            <strong>Día:</strong>{" "}
            {DIAS_SEMANA[cancelTarget?.dia_semana ?? ""] ?? cancelTarget?.dia_semana}
          </p>
          {cancelTarget?.hora_inicio && cancelTarget?.hora_fin && (
            <p>
              <strong>Horario:</strong>{" "}
              {formatTime(cancelTarget.hora_inicio)} –{" "}
              {formatTime(cancelTarget.hora_fin)}
            </p>
          )}
        </div>
      </Modal>

      {/* ── Activity detail / turno enrollment modal ─────────────────────── */}
      <Modal
        open={!!selectedActividad}
        onClose={() => setSelectedActividad(null)}
        title={selectedActividad?.nombre ?? ""}
        description={selectedActividad?.descripcion ?? undefined}
        size="lg"
      >
        {inscripcionMsg && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm border ${
              inscripcionMsg.type === "success"
                ? "bg-success-50 text-success-700 border-success-200"
                : "bg-danger-50 text-danger-600 border-danger-200"
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
                  (DIAS_ORDEN[a.dia_semana] ?? 99) -
                    (DIAS_ORDEN[b.dia_semana] ?? 99) ||
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
                          {formatTime(turno.hora_inicio)} –{" "}
                          {formatTime(turno.hora_fin)}
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}
