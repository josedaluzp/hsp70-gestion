import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Card,
  SearchInput,
  Table,
  Modal,
  Spinner,
  EmptyState,
  Pagination,
  Input,
} from "../../components/ui";
import type { Column } from "../../components/ui";
import {
  rutinasApi,
  ejerciciosApi,
} from "../../services/rutinaApi";
import type {
  Rutina,
  RutinaForm,
  Ejercicio,
  RutinaEjercicioItem,
  Asignacion,
} from "../../services/rutinaApi";
import api from "../../services/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 400;

const EMPTY_FORM: RutinaForm = {
  nombre: "",
  descripcion: "",
  ejercicios: [],
};

interface FormErrors {
  nombre?: string;
}

interface AlumnoOption {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Rutinas() {
  // List state
  const [data, setData] = useState<Rutina[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Create/Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rutina | null>(null);
  const [form, setForm] = useState<RutinaForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Exercise list for selection
  const [allEjercicios, setAllEjercicios] = useState<Ejercicio[]>([]);
  const [selectedEjercicios, setSelectedEjercicios] = useState<
    RutinaEjercicioItem[]
  >([]);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignRutina, setAssignRutina] = useState<Rutina | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false);
  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Debounced search ────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ─── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { nombre?: string; page: number; page_size: number } = {
        page,
        page_size: PAGE_SIZE,
      };
      if (debouncedSearch.trim()) {
        params.nombre = debouncedSearch.trim();
      }
      const res = await rutinasApi.list(params);
      setData(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      setData([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Fetch all exercises for selection ───────────────────────────────────

  async function fetchEjercicios() {
    try {
      const res = await ejerciciosApi.list({ page_size: 100 });
      setAllEjercicios(res.data.items);
    } catch {
      setAllEjercicios([]);
    }
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  function validate(values: RutinaForm): FormErrors {
    const errs: FormErrors = {};
    if (!values.nombre.trim()) {
      errs.nombre = "El nombre es obligatorio";
    }
    return errs;
  }

  // ─── Modal handlers ─────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedEjercicios([]);
    setErrors({});
    fetchEjercicios();
    setModalOpen(true);
  }

  async function openEdit(rutina: Rutina) {
    setEditing(rutina);
    setForm({
      nombre: rutina.nombre,
      descripcion: rutina.descripcion ?? "",
    });
    setErrors({});
    await fetchEjercicios();

    // Load current exercises for this routine
    try {
      const res = await rutinasApi.get(rutina.id);
      const items: RutinaEjercicioItem[] = res.data.ejercicios.map((re) => ({
        ejercicio_id: re.ejercicio.id,
        orden: re.orden,
      }));
      setSelectedEjercicios(items);
    } catch {
      setSelectedEjercicios([]);
    }

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedEjercicios([]);
    setErrors({});
  }

  // ─── Exercise toggle ────────────────────────────────────────────────────

  function toggleEjercicio(ejercicioId: number) {
    setSelectedEjercicios((prev) => {
      const exists = prev.find((e) => e.ejercicio_id === ejercicioId);
      if (exists) {
        return prev.filter((e) => e.ejercicio_id !== ejercicioId);
      }
      return [...prev, { ejercicio_id: ejercicioId, orden: prev.length + 1 }];
    });
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      // Recompute order based on current selection order
      const ejerciciosPayload = selectedEjercicios.map((e, idx) => ({
        ejercicio_id: e.ejercicio_id,
        orden: idx + 1,
      }));

      const payload: RutinaForm = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        ejercicios: ejerciciosPayload,
      };

      if (editing) {
        await rutinasApi.update(editing.id, payload);
      } else {
        await rutinasApi.create(payload);
      }
      closeModal();
      await fetchData();
    } catch {
      // Error is handled by global interceptor
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(rutina: Rutina) {
    const confirmed = window.confirm(
      `¿Estas seguro de que deseas eliminar la rutina "${rutina.nombre}"?`,
    );
    if (!confirmed) return;

    try {
      await rutinasApi.delete(rutina.id);
      await fetchData();
    } catch {
      // Error is handled by global interceptor
    }
  }

  // ─── Assign modal handlers ──────────────────────────────────────────────

  async function openAssignModal(rutina: Rutina) {
    setAssignRutina(rutina);
    setSelectedAlumnoId(null);
    setAssignModalOpen(true);
    setLoadingAsignaciones(true);

    try {
      const [asignRes, alumnosRes] = await Promise.all([
        rutinasApi.listAsignaciones(rutina.id),
        api.get<{ items: AlumnoOption[] }>("/usuarios", {
          params: { rol: "alumno", page_size: 100 },
        }),
      ]);
      setAsignaciones(asignRes.data);
      setAlumnos(alumnosRes.data.items);
    } catch {
      setAsignaciones([]);
      setAlumnos([]);
    } finally {
      setLoadingAsignaciones(false);
    }
  }

  function closeAssignModal() {
    setAssignModalOpen(false);
    setAssignRutina(null);
    setAsignaciones([]);
    setAlumnos([]);
    setSelectedAlumnoId(null);
  }

  async function handleAsignar() {
    if (!assignRutina || !selectedAlumnoId) return;
    setAssigning(true);
    try {
      await rutinasApi.asignar(assignRutina.id, selectedAlumnoId);
      // Refresh assignments
      const res = await rutinasApi.listAsignaciones(assignRutina.id);
      setAsignaciones(res.data);
      setSelectedAlumnoId(null);
      await fetchData();
    } catch {
      // Error is handled by global interceptor
    } finally {
      setAssigning(false);
    }
  }

  async function handleDesasignar(alumnoId: number) {
    if (!assignRutina) return;
    try {
      await rutinasApi.desasignar(assignRutina.id, alumnoId);
      const res = await rutinasApi.listAsignaciones(assignRutina.id);
      setAsignaciones(res.data);
      await fetchData();
    } catch {
      // Error is handled by global interceptor
    }
  }

  // ─── Form field updater ──────────────────────────────────────────────────

  function updateField<K extends keyof RutinaForm>(
    key: K,
    value: RutinaForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FormErrors];
        return next;
      });
    }
  }

  // ─── Available alumnos (not yet assigned) ────────────────────────────────

  const assignedAlumnoIds = new Set(asignaciones.map((a) => a.alumno_id));
  const availableAlumnos = alumnos.filter(
    (a) => !assignedAlumnoIds.has(a.id),
  );

  // ─── Table columns ──────────────────────────────────────────────────────

  const columns: Column<Rutina>[] = [
    {
      key: "nombre",
      header: "Nombre",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-neutral-900">{row.nombre}</span>
      ),
    },
    {
      key: "profesor_nombre",
      header: "Profesor",
      render: (row) => (
        <span className="text-neutral-600">
          {row.profesor_nombre ?? "—"}
        </span>
      ),
    },
    {
      key: "ejercicio_count",
      header: "Ejercicios",
      sortable: true,
      render: (row) => <span>{row.ejercicio_count}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "w-[240px]",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(row)}
            icon={
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            }
          >
            Editar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openAssignModal(row)}
            icon={
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
            }
          >
            Asignar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(row)}
            icon={
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            }
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Gestion de Rutinas
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Administra las rutinas de entrenamiento y sus asignaciones
          </p>
        </div>
        <Button
          onClick={openCreate}
          icon={
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          }
        >
          Nueva Rutina
        </Button>
      </div>

      {/* Search / Filter bar */}
      <div className="flex items-center gap-4">
        <div className="w-full max-w-sm">
          <SearchInput
            placeholder="Buscar rutina por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />
        </div>
        {total > 0 && (
          <span className="text-sm text-neutral-500">
            {total} {total === 1 ? "rutina" : "rutinas"}
          </span>
        )}
      </div>

      {/* Table card */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" label="Cargando rutinas..." />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                />
              </svg>
            }
            title="Sin rutinas"
            description={
              debouncedSearch
                ? "No se encontraron rutinas con ese nombre. Intenta con otro termino."
                : "Aun no hay rutinas registradas. Crea la primera."
            }
            action={
              !debouncedSearch ? (
                <Button onClick={openCreate}>Nueva Rutina</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table<Rutina>
              columns={columns}
              data={data}
              keyExtractor={(row) => row.id}
            />
            <div className="border-t border-neutral-100 px-4 py-3">
              <Pagination
                currentPage={page}
                totalPages={pages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar Rutina" : "Nueva Rutina"}
        description={
          editing
            ? "Modifica los datos de la rutina"
            : "Completa los datos para crear una nueva rutina"
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Guardar Cambios" : "Crear Rutina"}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <Input
            label="Nombre"
            placeholder="Ej: Rutina de fuerza, Cardio avanzado..."
            value={form.nombre}
            onChange={(e) => updateField("nombre", e.target.value)}
            error={errors.nombre}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Descripcion
            </label>
            <textarea
              placeholder="Descripcion de la rutina (opcional)"
              value={form.descripcion ?? ""}
              onChange={(e) => updateField("descripcion", e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 transition-colors duration-150 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
            />
          </div>

          {/* Exercise selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Ejercicios
            </label>
            <p className="text-xs text-neutral-500">
              Selecciona los ejercicios que componen esta rutina
            </p>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-100">
              {allEjercicios.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-neutral-400">
                  No hay ejercicios disponibles
                </p>
              ) : (
                allEjercicios.map((ej) => {
                  const isSelected = selectedEjercicios.some(
                    (s) => s.ejercicio_id === ej.id,
                  );
                  return (
                    <label
                      key={ej.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEjercicio(ej.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-neutral-800">
                        {ej.nombre}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            {selectedEjercicios.length > 0 && (
              <p className="text-xs text-neutral-500">
                {selectedEjercicios.length}{" "}
                {selectedEjercicios.length === 1
                  ? "ejercicio seleccionado"
                  : "ejercicios seleccionados"}
              </p>
            )}
          </div>

          {/* Hidden submit for enter key */}
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal
        open={assignModalOpen}
        onClose={closeAssignModal}
        title={`Asignar alumnos — ${assignRutina?.nombre ?? ""}`}
        description="Gestiona los alumnos asignados a esta rutina"
        size="lg"
      >
        {loadingAsignaciones ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Add assignment */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Agregar alumno
              </label>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <select
                    value={selectedAlumnoId ?? ""}
                    onChange={(e) =>
                      setSelectedAlumnoId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 transition-colors duration-150 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
                  >
                    <option value="">Seleccionar alumno...</option>
                    {availableAlumnos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} {a.apellido} ({a.email})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleAsignar}
                  disabled={!selectedAlumnoId}
                  loading={assigning}
                  size="md"
                >
                  Asignar
                </Button>
              </div>
            </div>

            {/* Current assignments */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Alumnos asignados ({asignaciones.length})
              </label>
              {asignaciones.length === 0 ? (
                <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-400">
                  No hay alumnos asignados a esta rutina
                </p>
              ) : (
                <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100">
                  {asignaciones.map((asig) => (
                    <div
                      key={asig.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-sm text-neutral-800">
                        {asig.alumno_nombre ?? `Alumno #${asig.alumno_id}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDesasignar(asig.alumno_id)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-danger-50 hover:text-danger-500 transition-colors"
                        title="Quitar asignacion"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
