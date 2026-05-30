import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
  Card,
  CardHeader,
  Spinner,
  EmptyState,
  Badge,
  Button,
  Select,
  Input,
} from "../../components/ui";
import {
  misTurnos,
  actividadesRef,
  inscritos as inscritosApi,
  asistencias as asistenciasApi,
  pausa as pausaApi,
} from "../../services/profesorApi";
import type { Turno, Actividad } from "../../services/adminApi";

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

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface AttendanceRow {
  inscripcionId: number;
  alumnoId: string;
  nombre: string;
  enPausa: boolean;
  presente: boolean;
  observacion: string;
  asistenciaId: number | null;
  dirty: boolean;
  pausaSaving: boolean;
}

export default function ProfesorAsistencia() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [turnosList, setTurnosList] = useState<Turno[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [selectedTurno, setSelectedTurno] = useState<string>("");
  const [fecha, setFecha] = useState<string>(todayISO());

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actividadMap = useMemo(() => {
    const map = new Map<number, Actividad>();
    actividades.forEach((a) => map.set(a.id, a));
    return map;
  }, [actividades]);

  // Load initial data: professor's turnos + activities
  useEffect(() => {
    if (!user) return;

    async function init() {
      setLoadingInit(true);
      try {
        const [turnosRes, actRes] = await Promise.all([
          misTurnos.list(user!.id),
          actividadesRef.list(),
        ]);
        setTurnosList(turnosRes.data.items);
        setActividades(actRes.data.items);

        // Pre-select turno from URL param
        const turnoParam = searchParams.get("turno");
        if (turnoParam && turnosRes.data.items.some((t) => String(t.id) === turnoParam)) {
          setSelectedTurno(turnoParam);
        }
      } catch {
        setError("No se pudieron cargar los turnos.");
      } finally {
        setLoadingInit(false);
      }
    }

    init();
  }, [user, searchParams]);

  // Load attendance data when turno or date changes
  useEffect(() => {
    if (!selectedTurno || !fecha) {
      setRows([]);
      return;
    }

    async function loadAttendance() {
      setLoadingData(true);
      setError(null);
      setSaveMsg(null);
      try {
        const turnoId = Number(selectedTurno);
        const [inscRes, asistRes] = await Promise.all([
          inscritosApi.list(turnoId, { page_size: 100 }),
          asistenciasApi.listByTurno(turnoId, fecha),
        ]);

        const inscArray = (inscRes.data as unknown as any[]) ?? [];
        const asistArray = (asistRes.data as unknown as any[]) ?? [];

        const asistMap = new Map<number, { id: number; presente: boolean; observacion: string | null }>();
        for (const a of asistArray) {
          const inscId = a?.inscripcion?.id;
          if (inscId != null) asistMap.set(inscId, { id: a.id, presente: a.presente, observacion: a.observacion });
        }

        const newRows: AttendanceRow[] = inscArray
          .filter((i) => i.estado === "activa")
          .map((insc) => {
            const existing = asistMap.get(insc.id);
            const alumno = insc.alumno ?? {};
            return {
              inscripcionId: insc.id,
              alumnoId: alumno.id,
              nombre: alumno.nombre ? `${alumno.nombre} ${alumno.apellido ?? ""}`.trim() : `Alumno #${insc.id}`,
              enPausa: Boolean(alumno.en_pausa),
              presente: existing?.presente ?? false,
              observacion: existing?.observacion ?? "",
              asistenciaId: existing?.id ?? null,
              dirty: false,
              pausaSaving: false,
            };
          });

        newRows.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setRows(newRows);
      } catch {
        setError("No se pudo cargar la lista de asistencia.");
      } finally {
        setLoadingData(false);
      }
    }

    loadAttendance();
  }, [selectedTurno, fecha]);

  const togglePresente = useCallback((inscripcionId: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.inscripcionId === inscripcionId
          ? { ...r, presente: !r.presente, dirty: true }
          : r,
      ),
    );
    setSaveMsg(null);
  }, []);

  const togglePausa = useCallback(async (inscripcionId: number, alumnoId: string) => {
    setRows((prev) => prev.map((r) =>
      r.inscripcionId === inscripcionId ? { ...r, pausaSaving: true } : r));
    try {
      const res = await pausaApi.toggle(alumnoId);
      setRows((prev) => prev.map((r) =>
        r.inscripcionId === inscripcionId ? { ...r, enPausa: res.data.en_pausa, pausaSaving: false } : r));
    } catch {
      setRows((prev) => prev.map((r) =>
        r.inscripcionId === inscripcionId ? { ...r, pausaSaving: false } : r));
    }
  }, []);

  const updateObservacion = useCallback(
    (inscripcionId: number, value: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.inscripcionId === inscripcionId
            ? { ...r, observacion: value, dirty: true }
            : r,
        ),
      );
      setSaveMsg(null);
    },
    [],
  );

  const markAllPresent = useCallback(() => {
    setRows((prev) => prev.map((r) => ({ ...r, presente: true, dirty: true })));
    setSaveMsg(null);
  }, []);

  const hasDirtyRows = rows.some((r) => r.dirty);
  const presentCount = rows.filter((r) => r.presente).length;

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const promises = rows
        .filter((r) => r.dirty)
        .map((r) => {
          if (r.asistenciaId) {
            return asistenciasApi.actualizar(r.asistenciaId, {
              presente: r.presente,
              observacion: r.observacion || null,
            });
          }
          return asistenciasApi.registrar({
            inscripcion_id: r.inscripcionId,
            fecha,
            presente: r.presente,
            observacion: r.observacion || null,
          });
        });

      await Promise.all(promises);
      setSaveMsg({ type: "success", text: "Asistencia guardada correctamente." });

      // Mark all as clean and refresh asistencia IDs
      const turnoId = Number(selectedTurno);
      const asistRes = await asistenciasApi.listByTurno(turnoId, fecha);
      const asistMap = new Map<number, { id: number }>();
      for (const a of (asistRes.data as unknown as any[]) ?? []) {
        const inscId = a?.inscripcion?.id;
        if (inscId != null) asistMap.set(inscId, { id: a.id });
      }

      setRows((prev) =>
        prev.map((r) => {
          const updated = asistMap.get(r.inscripcionId);
          return { ...r, asistenciaId: updated?.id ?? r.asistenciaId, dirty: false };
        }),
      );
    } catch {
      setSaveMsg({ type: "error", text: "Error al guardar. Intente nuevamente." });
    } finally {
      setSaving(false);
    }
  }

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && turnosList.length === 0) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-600">
        {error}
      </div>
    );
  }

  const turnoOptions = turnosList.map((t) => {
    const act = actividadMap.get(t.actividad_id);
    const label = `${act?.nombre ?? "Actividad"} — ${DIAS_SEMANA[t.dia_semana] ?? t.dia_semana} ${formatTime(t.hora_inicio)}–${formatTime(t.hora_fin)}`;
    return { value: String(t.id), label };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Tomar Asistencia
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Seleccioná un turno y fecha para registrar la asistencia
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Turno"
            value={selectedTurno}
            onChange={(e) => setSelectedTurno(e.target.value)}
            options={[
              { value: "", label: "Seleccionar turno..." },
              ...turnoOptions,
            ]}
          />
          <Input
            label="Fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </Card>

      {/* Attendance list */}
      {!selectedTurno ? (
        <Card>
          <EmptyState
            title="Seleccioná un turno"
            description="Elegí un turno del selector de arriba para ver la lista de alumnos."
            icon={<ClipboardListIcon className="h-12 w-12" />}
          />
        </Card>
      ) : loadingData ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-600">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin alumnos inscritos"
            description="Este turno no tiene alumnos con inscripción activa."
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="p-4 sm:p-6 border-b border-neutral-100">
            <CardHeader
              title={`Lista de asistencia (${rows.length} alumno${rows.length !== 1 ? "s" : ""})`}
              description={`${presentCount} presente${presentCount !== 1 ? "s" : ""} de ${rows.length}`}
              action={
                <Button variant="outline" size="sm" onClick={markAllPresent}>
                  Marcar todos presentes
                </Button>
              }
            />
          </div>

          <div className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <div
                key={row.inscripcionId}
                className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 transition-colors ${
                  row.presente ? "bg-success-50/40" : ""
                }`}
              >
                {/* Checkbox + Name */}
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={row.presente}
                    onChange={() => togglePresente(row.inscripcionId)}
                    className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-neutral-900">
                    {row.nombre}
                  </span>
                  {row.presente && (
                    <Badge variant="success" className="ml-auto sm:ml-2">
                      Presente
                    </Badge>
                  )}
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={row.enPausa}
                    disabled={row.pausaSaving}
                    onChange={() => togglePausa(row.inscripcionId, row.alumnoId)}
                    className="h-4 w-4 rounded border-neutral-300 text-warning-500 focus:ring-warning-500"
                  />
                  En pausa
                </label>

                {/* Observation */}
                <input
                  type="text"
                  placeholder="Observación..."
                  value={row.observacion}
                  onChange={(e) =>
                    updateObservacion(row.inscripcionId, e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 sm:w-56"
                />
              </div>
            ))}
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-neutral-200 bg-white p-4 sm:px-6">
            <div className="text-sm text-neutral-500">
              {hasDirtyRows ? (
                <span className="text-warning-600 font-medium">
                  Hay cambios sin guardar
                </span>
              ) : (
                saveMsg && (
                  <span
                    className={
                      saveMsg.type === "success"
                        ? "text-success-600"
                        : "text-danger-600"
                    }
                  >
                    {saveMsg.text}
                  </span>
                )
              )}
            </div>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!hasDirtyRows || saving}
            >
              Guardar asistencia
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}
