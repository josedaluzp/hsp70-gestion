import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState, Badge, Button, Modal } from "../../components/ui";
import { inscripciones } from "../../services/alumnoApi";
import type { MiInscripcion } from "../../services/alumnoApi";

const DIAS_SEMANA: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
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

const ESTADO_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  activa: { label: "Activa", variant: "success" },
  cancelada: { label: "Cancelada", variant: "danger" },
  lista_espera: { label: "Lista de espera", variant: "warning" },
};

export default function AlumnoInscripciones() {
  const { user } = useAuth();

  const [lista, setLista] = useState<MiInscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<MiInscripcion | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchInscripciones();
  }, [user, showAll]);

  async function fetchInscripciones() {
    setLoading(true);
    setError(null);
    try {
      const res = await inscripciones.list(user!.id, {
        solo_activas: !showAll,
        page_size: 100,
      });
      setLista(res.data.items);
    } catch {
      setError("No se pudieron cargar las inscripciones.");
    } finally {
      setLoading(false);
    }
  }

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Mis Inscripciones
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Tus turnos y estado de inscripción
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
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

      {lista.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin inscripciones"
            description={
              showAll
                ? "No tenés inscripciones registradas."
                : "No tenés inscripciones activas."
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
                        Estado
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-neutral-500">
                        Fecha inscripción
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
                        <tr key={insc.id} className="hover:bg-neutral-50/50 transition-colors">
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
                      {DIAS_SEMANA[insc.dia_semana ?? ""] ?? "—"}{" "}
                      {insc.hora_inicio && insc.hora_fin
                        ? `· ${formatTime(insc.hora_inicio)} – ${formatTime(insc.hora_fin)}`
                        : ""}
                    </p>
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

      {/* Cancel confirmation modal */}
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
            <Button
              variant="danger"
              onClick={handleCancelar}
              loading={cancelling}
            >
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
              {formatTime(cancelTarget.hora_inicio)} – {formatTime(cancelTarget.hora_fin)}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
