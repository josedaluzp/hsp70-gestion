import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  Modal,
  Badge,
  Spinner,
  EmptyState,
  Pagination,
} from "../../components/ui";
import type { Column } from "../../components/ui";
import {
  turnos,
  actividades,
  profesores,
  type Turno,
  type TurnoForm,
  type Actividad,
  type Profesor,
} from "../../services/adminApi";

// ─── Constants ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
] as const;

const GRID_DAYS = DIAS_SEMANA.slice(0, 6); // Lunes to Sábado for grid

const DIA_LABEL: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 22;
const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => GRID_START_HOUR + i
);

const ACTIVITY_COLORS = [
  { bg: "bg-primary-50", border: "border-primary-200", text: "text-primary-700" },
  { bg: "bg-accent-50", border: "border-accent-200", text: "text-accent-700" },
  { bg: "bg-success-50", border: "border-success-200", text: "text-success-600" },
  { bg: "bg-warning-50", border: "border-warning-200", text: "text-warning-600" },
  { bg: "bg-danger-50", border: "border-danger-200", text: "text-danger-600" },
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
];

const PAGE_SIZE = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTimeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
}

function getColorForActivity(actividadId: number): (typeof ACTIVITY_COLORS)[number] {
  return ACTIVITY_COLORS[actividadId % ACTIVITY_COLORS.length];
}

const EMPTY_FORM: TurnoForm = {
  actividad_id: 0,
  profesor_id: 0,
  dia_semana: "",
  hora_inicio: "",
  hora_fin: "",
  sala: "",
  activo: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

type ViewMode = "grid" | "table";

interface FormErrors {
  actividad_id?: string;
  profesor_id?: string;
  dia_semana?: string;
  hora_inicio?: string;
  hora_fin?: string;
}

export default function TurnosPage() {
  // Data
  const [turnosList, setTurnosList] = useState<Turno[]>([]);
  const [allTurnos, setAllTurnos] = useState<Turno[]>([]);
  const [actividadesList, setActividadesList] = useState<Actividad[]>([]);
  const [profesoresList, setProfesoresList] = useState<Profesor[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filters
  const [filterActividad, setFilterActividad] = useState("");
  const [filterProfesor, setFilterProfesor] = useState("");
  const [filterDia, setFilterDia] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null);
  const [form, setForm] = useState<TurnoForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingTurno, setDeletingTurno] = useState<Turno | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Lookup maps ─────────────────────────────────────────────────────────

  const actividadMap = useMemo(() => {
    const map = new Map<number, Actividad>();
    actividadesList.forEach((a) => map.set(a.id, a));
    return map;
  }, [actividadesList]);

  const profesorMap = useMemo(() => {
    const map = new Map<number, Profesor>();
    profesoresList.forEach((p) => map.set(p.id, p));
    return map;
  }, [profesoresList]);

  // ─── Data loading ────────────────────────────────────────────────────────

  const loadReferenceData = useCallback(async () => {
    try {
      const [actRes, profRes] = await Promise.all([
        actividades.list({ page_size: 200 }),
        profesores.list(),
      ]);
      setActividadesList(actRes.data.items);
      setProfesoresList(Array.isArray(profRes.data) ? profRes.data : []);
    } catch {
      // Silently handle — reference data will be empty
    }
  }, []);

  const loadTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: PAGE_SIZE,
      };
      if (filterActividad) params.actividad_id = Number(filterActividad);
      if (filterProfesor) params.profesor_id = Number(filterProfesor);
      if (filterDia) params.dia_semana = filterDia;

      const res = await turnos.list(params as Parameters<typeof turnos.list>[0]);
      setTurnosList(res.data.items);
      setTotalPages(res.data.pages);
    } catch {
      setTurnosList([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filterActividad, filterProfesor, filterDia]);

  const loadAllTurnos = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { page_size: 500 };
      if (filterActividad) params.actividad_id = Number(filterActividad);
      if (filterProfesor) params.profesor_id = Number(filterProfesor);
      if (filterDia) params.dia_semana = filterDia;

      const res = await turnos.list(params as Parameters<typeof turnos.list>[0]);
      setAllTurnos(res.data.items);
    } catch {
      setAllTurnos([]);
    }
  }, [filterActividad, filterProfesor, filterDia]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (viewMode === "table") {
      loadTurnos();
    } else {
      loadAllTurnos();
    }
  }, [viewMode, loadTurnos, loadAllTurnos]);

  // ─── Filter handlers ─────────────────────────────────────────────────────

  function handleFilterActividad(value: string) {
    setFilterActividad(value);
    setPage(1);
  }

  function handleFilterProfesor(value: string) {
    setFilterProfesor(value);
    setPage(1);
  }

  function handleFilterDia(value: string) {
    setFilterDia(value);
    setPage(1);
  }

  // ─── Form validation ─────────────────────────────────────────────────────

  function validateForm(): boolean {
    const errors: FormErrors = {};

    if (!form.actividad_id) {
      errors.actividad_id = "Seleccione una actividad";
    }
    if (!form.profesor_id) {
      errors.profesor_id = "Seleccione un profesor";
    }
    if (!form.dia_semana) {
      errors.dia_semana = "Seleccione un día";
    }
    if (!form.hora_inicio) {
      errors.hora_inicio = "Ingrese hora de inicio";
    }
    if (!form.hora_fin) {
      errors.hora_fin = "Ingrese hora de fin";
    }
    if (form.hora_inicio && form.hora_fin && form.hora_inicio >= form.hora_fin) {
      errors.hora_fin = "La hora de fin debe ser posterior a la de inicio";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── CRUD handlers ───────────────────────────────────────────────────────

  function openCreateModal() {
    setEditingTurno(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setModalOpen(true);
  }

  function openEditModal(turno: Turno) {
    setEditingTurno(turno);
    setForm({
      actividad_id: turno.actividad_id,
      profesor_id: turno.profesor_id,
      dia_semana: turno.dia_semana,
      hora_inicio: turno.hora_inicio.slice(0, 5),
      hora_fin: turno.hora_fin.slice(0, 5),
      sala: turno.sala ?? "",
      activo: turno.activo,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTurno(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload: TurnoForm = {
        actividad_id: Number(form.actividad_id),
        profesor_id: Number(form.profesor_id),
        dia_semana: form.dia_semana,
        hora_inicio: form.hora_inicio.length === 5 ? `${form.hora_inicio}:00` : form.hora_inicio,
        hora_fin: form.hora_fin.length === 5 ? `${form.hora_fin}:00` : form.hora_fin,
        sala: form.sala || undefined,
        activo: form.activo,
      };

      if (editingTurno) {
        await turnos.update(editingTurno.id, payload);
      } else {
        await turnos.create(payload);
      }

      closeModal();
      if (viewMode === "table") {
        loadTurnos();
      } else {
        loadAllTurnos();
      }
    } catch {
      // Error is surfaced via network layer
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(turno: Turno) {
    setDeletingTurno(turno);
    setDeleteModal(true);
  }

  function closeDeleteModal() {
    setDeleteModal(false);
    setDeletingTurno(null);
  }

  async function handleDelete() {
    if (!deletingTurno) return;

    setDeleting(true);
    try {
      await turnos.delete(deletingTurno.id);
      closeDeleteModal();
      if (viewMode === "table") {
        loadTurnos();
      } else {
        loadAllTurnos();
      }
    } catch {
      // Error is surfaced via network layer
    } finally {
      setDeleting(false);
    }
  }

  // ─── Select options ──────────────────────────────────────────────────────

  const actividadOptions = useMemo(
    () =>
      actividadesList.map((a) => ({
        value: String(a.id),
        label: a.nombre,
      })),
    [actividadesList]
  );

  const profesorOptions = useMemo(
    () =>
      profesoresList.map((p) => ({
        value: String(p.id),
        label: `${p.nombre} ${p.apellido}`,
      })),
    [profesoresList]
  );

  const diaOptions = DIAS_SEMANA.map((d) => ({
    value: d.value,
    label: d.label,
  }));

  // ─── Table columns ───────────────────────────────────────────────────────

  const columns: Column<Turno>[] = useMemo(
    () => [
      {
        key: "actividad",
        header: "Actividad",
        sortable: true,
        render: (row: Turno) => {
          const act = actividadMap.get(row.actividad_id);
          return (
            <span className="font-medium text-neutral-900">
              {act?.nombre ?? `ID ${row.actividad_id}`}
            </span>
          );
        },
      },
      {
        key: "profesor",
        header: "Profesor",
        sortable: true,
        render: (row: Turno) => {
          const prof = profesorMap.get(row.profesor_id);
          return prof
            ? `${prof.nombre} ${prof.apellido}`
            : `ID ${row.profesor_id}`;
        },
      },
      {
        key: "dia_semana",
        header: "Día",
        sortable: true,
        render: (row: Turno) => DIA_LABEL[row.dia_semana] ?? row.dia_semana,
      },
      {
        key: "horario",
        header: "Horario",
        render: (row: Turno) => formatTimeRange(row.hora_inicio, row.hora_fin),
      },
      {
        key: "sala",
        header: "Sala",
        render: (row: Turno) => (
          <span className="text-neutral-500">{row.sala ?? "-"}</span>
        ),
      },
      {
        key: "activo",
        header: "Estado",
        render: (row: Turno) =>
          row.activo ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="default">Inactivo</Badge>
          ),
      },
      {
        key: "acciones",
        header: "",
        className: "w-24 text-right",
        render: (row: Turno) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Editar turno"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => openDeleteModal(row)}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
              aria-label="Eliminar turno"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    [actividadMap, profesorMap]
  );

  // ─── Grid data ────────────────────────────────────────────────────────────

  const turnosByDay = useMemo(() => {
    const map = new Map<string, Turno[]>();
    GRID_DAYS.forEach((d) => map.set(d.value, []));

    const source = viewMode === "grid" ? allTurnos : turnosList;
    source.forEach((t) => {
      if (t.activo) {
        const list = map.get(t.dia_semana);
        if (list) list.push(t);
      }
    });

    return map;
  }, [allTurnos, turnosList, viewMode]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Gestión de Turnos
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Administre los horarios y turnos de actividades
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                viewMode === "grid"
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Grilla
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                viewMode === "table"
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              Tabla
            </button>
          </div>

          <Button
            onClick={openCreateModal}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
          >
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-52">
            <Select
              label="Actividad"
              placeholder="Todas"
              value={filterActividad}
              onChange={(e) => handleFilterActividad(e.target.value)}
              options={actividadOptions}
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              label="Profesor"
              placeholder="Todos"
              value={filterProfesor}
              onChange={(e) => handleFilterProfesor(e.target.value)}
              options={profesorOptions}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              label="Día"
              placeholder="Todos"
              value={filterDia}
              onChange={(e) => handleFilterDia(e.target.value)}
              options={diaOptions}
            />
          </div>
          {(filterActividad || filterProfesor || filterDia) && (
            <button
              type="button"
              onClick={() => {
                setFilterActividad("");
                setFilterProfesor("");
                setFilterDia("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 self-end rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" label="Cargando turnos..." />
        </div>
      ) : viewMode === "grid" ? (
        <WeeklyGrid
          turnosByDay={turnosByDay}
          actividadMap={actividadMap}
          profesorMap={profesorMap}
          onEdit={openEditModal}
        />
      ) : (
        <Card padding="none">
          {turnosList.length === 0 ? (
            <EmptyState
              title="No hay turnos"
              description="No se encontraron turnos con los filtros seleccionados."
              action={
                <Button onClick={openCreateModal} size="sm">
                  Crear primer turno
                </Button>
              }
            />
          ) : (
            <>
              <Table<Turno & Record<string, unknown>>
                columns={columns as Column<Turno & Record<string, unknown>>[]}
                data={turnosList as (Turno & Record<string, unknown>)[]}
                keyExtractor={(row) => row.id}
              />
              <div className="border-t border-neutral-100 px-4 py-3">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingTurno ? "Editar Turno" : "Nuevo Turno"}
        description={
          editingTurno
            ? "Modifique los datos del turno seleccionado."
            : "Complete los datos para crear un nuevo turno."
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingTurno ? "Guardar cambios" : "Crear turno"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Actividad"
            placeholder="Seleccionar actividad"
            value={String(form.actividad_id || "")}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                actividad_id: Number(e.target.value),
              }))
            }
            options={actividadOptions}
            error={formErrors.actividad_id}
          />
          <Select
            label="Profesor"
            placeholder="Seleccionar profesor"
            value={String(form.profesor_id || "")}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                profesor_id: Number(e.target.value),
              }))
            }
            options={profesorOptions}
            error={formErrors.profesor_id}
          />
          <Select
            label="Día de la semana"
            placeholder="Seleccionar día"
            value={form.dia_semana}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dia_semana: e.target.value }))
            }
            options={diaOptions}
            error={formErrors.dia_semana}
          />
          <Input
            label="Sala"
            placeholder="Ej: Sala A, Pileta, etc."
            value={form.sala ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sala: e.target.value }))
            }
            helperText="Opcional"
          />
          <Input
            label="Hora de inicio"
            type="time"
            value={form.hora_inicio}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, hora_inicio: e.target.value }))
            }
            error={formErrors.hora_inicio}
          />
          <Input
            label="Hora de fin"
            type="time"
            value={form.hora_fin}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, hora_fin: e.target.value }))
            }
            error={formErrors.hora_fin}
          />
          {editingTurno && (
            <div className="col-span-full">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.activo ?? true}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, activo: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500/30"
                />
                <span className="font-medium text-neutral-700">Turno activo</span>
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteModal}
        onClose={closeDeleteModal}
        title="Eliminar turno"
        description="Esta acción no se puede deshacer."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeDeleteModal}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Eliminar
            </Button>
          </>
        }
      >
        {deletingTurno && (
          <p className="text-sm text-neutral-600">
            Se eliminará el turno de{" "}
            <span className="font-semibold">
              {actividadMap.get(deletingTurno.actividad_id)?.nombre ??
                `Actividad ${deletingTurno.actividad_id}`}
            </span>{" "}
            el día{" "}
            <span className="font-semibold">
              {DIA_LABEL[deletingTurno.dia_semana] ?? deletingTurno.dia_semana}
            </span>{" "}
            de{" "}
            <span className="font-semibold">
              {formatTimeRange(deletingTurno.hora_inicio, deletingTurno.hora_fin)}
            </span>
            .
          </p>
        )}
      </Modal>
    </div>
  );
}

// ─── Weekly Grid Component ──────────────────────────────────────────────────

interface WeeklyGridProps {
  turnosByDay: Map<string, Turno[]>;
  actividadMap: Map<number, Actividad>;
  profesorMap: Map<number, Profesor>;
  onEdit: (turno: Turno) => void;
}

function WeeklyGrid({
  turnosByDay,
  actividadMap,
  profesorMap,
  onEdit,
}: WeeklyGridProps) {
  const hasTurnos = Array.from(turnosByDay.values()).some((list) => list.length > 0);

  if (!hasTurnos) {
    return (
      <Card>
        <EmptyState
          title="Sin turnos activos"
          description="No hay turnos activos para mostrar en la grilla semanal."
        />
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row with day names */}
          <div className="grid grid-cols-[72px_repeat(6,1fr)] border-b border-neutral-200">
            <div className="border-r border-neutral-100 px-2 py-3" />
            {GRID_DAYS.map((day) => (
              <div
                key={day.value}
                className="border-r border-neutral-100 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 last:border-r-0"
              >
                {day.label}
              </div>
            ))}
          </div>

          {/* Time rows */}
          <div className="relative">
            {GRID_HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[72px_repeat(6,1fr)] border-b border-neutral-50 last:border-b-0"
                style={{ height: 64 }}
              >
                {/* Time label */}
                <div className="flex items-start border-r border-neutral-100 px-2 pt-1">
                  <span className="text-[11px] font-medium text-neutral-400">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>

                {/* Day columns */}
                {GRID_DAYS.map((day) => (
                  <div
                    key={day.value}
                    className="relative border-r border-neutral-50 last:border-r-0"
                  >
                    {(turnosByDay.get(day.value) ?? [])
                      .filter((t) => {
                        const startMin = parseTimeToMinutes(t.hora_inicio);
                        const startHour = Math.floor(startMin / 60);
                        return startHour === hour;
                      })
                      .map((turno) => {
                        const startMin = parseTimeToMinutes(turno.hora_inicio);
                        const endMin = parseTimeToMinutes(turno.hora_fin);
                        const offsetMinutes = startMin - hour * 60;
                        const duration = endMin - startMin;
                        const topPx = (offsetMinutes / 60) * 64;
                        const heightPx = Math.max((duration / 60) * 64 - 2, 20);
                        const color = getColorForActivity(turno.actividad_id);
                        const actName =
                          actividadMap.get(turno.actividad_id)?.nombre ?? "—";
                        const prof = profesorMap.get(turno.profesor_id);
                        const profName = prof
                          ? `${prof.nombre} ${prof.apellido}`
                          : "";

                        return (
                          <button
                            key={turno.id}
                            type="button"
                            onClick={() => onEdit(turno)}
                            className={`absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-left transition-shadow duration-150 hover:shadow-md ${color.bg} ${color.border} ${color.text}`}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              zIndex: 10,
                            }}
                            title={`${actName} - ${profName}\n${formatTimeRange(turno.hora_inicio, turno.hora_fin)}${turno.sala ? `\nSala: ${turno.sala}` : ""}`}
                          >
                            <p className="truncate text-xs font-semibold leading-tight">
                              {actName}
                            </p>
                            {heightPx >= 36 && (
                              <p className="mt-0.5 truncate text-[10px] leading-tight opacity-75">
                                {profName}
                              </p>
                            )}
                            {heightPx >= 52 && turno.sala && (
                              <p className="mt-0.5 truncate text-[10px] leading-tight opacity-60">
                                {turno.sala}
                              </p>
                            )}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
