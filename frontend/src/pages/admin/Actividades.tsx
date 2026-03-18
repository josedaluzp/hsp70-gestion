import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Card,
  SearchInput,
  Table,
  Modal,
  Badge,
  Spinner,
  EmptyState,
  Pagination,
  Input,
} from "../../components/ui";
import type { Column } from "../../components/ui";
import {
  actividades,
  type Actividad,
  type ActividadForm,
} from "../../services/adminApi";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 400;

const EMPTY_FORM: ActividadForm = {
  nombre: "",
  descripcion: "",
  cupo_maximo: 1,
  duracion_min: 1,
};

interface FormErrors {
  nombre?: string;
  cupo_maximo?: string;
  duracion_min?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Actividades() {
  // List state
  const [data, setData] = useState<Actividad[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const [form, setForm] = useState<ActividadForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

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
      const res = await actividades.list(params);
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

  // ─── Validation ──────────────────────────────────────────────────────────

  function validate(values: ActividadForm): FormErrors {
    const errs: FormErrors = {};
    if (!values.nombre.trim()) {
      errs.nombre = "El nombre es obligatorio";
    }
    if (!values.cupo_maximo || values.cupo_maximo < 1) {
      errs.cupo_maximo = "El cupo debe ser al menos 1";
    }
    if (!values.duracion_min || values.duracion_min < 1) {
      errs.duracion_min = "La duración debe ser al menos 1 minuto";
    }
    return errs;
  }

  // ─── Modal handlers ─────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(actividad: Actividad) {
    setEditing(actividad);
    setForm({
      nombre: actividad.nombre,
      descripcion: actividad.descripcion ?? "",
      cupo_maximo: actividad.cupo_maximo,
      duracion_min: actividad.duracion_min,
      activa: actividad.activa,
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const payload: ActividadForm = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        cupo_maximo: Number(form.cupo_maximo),
        duracion_min: Number(form.duracion_min),
      };

      if (editing) {
        payload.activa = form.activa;
        await actividades.update(editing.id, payload);
      } else {
        await actividades.create(payload);
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

  async function handleDelete(actividad: Actividad) {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la actividad "${actividad.nombre}"?`
    );
    if (!confirmed) return;

    try {
      await actividades.delete(actividad.id);
      await fetchData();
    } catch {
      // Error is handled by global interceptor
    }
  }

  // ─── Form field updater ──────────────────────────────────────────────────

  function updateField<K extends keyof ActividadForm>(
    key: K,
    value: ActividadForm[K]
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

  // ─── Table columns ──────────────────────────────────────────────────────

  const columns: Column<Actividad>[] = [
    {
      key: "nombre",
      header: "Nombre",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-neutral-900">{row.nombre}</span>
      ),
    },
    {
      key: "descripcion",
      header: "Descripción",
      className: "max-w-[240px]",
      render: (row) => (
        <span className="block truncate text-neutral-500">
          {row.descripcion || "—"}
        </span>
      ),
    },
    {
      key: "cupo_maximo",
      header: "Cupo Máximo",
      sortable: true,
      render: (row) => <span>{row.cupo_maximo}</span>,
    },
    {
      key: "duracion_min",
      header: "Duración",
      sortable: true,
      render: (row) => <span>{row.duracion_min} min</span>,
    },
    {
      key: "activa",
      header: "Estado",
      render: (row) => (
        <Badge variant={row.activa ? "success" : "default"}>
          {row.activa ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "w-[160px]",
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
            Gestión de Actividades
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Administra las actividades disponibles en el centro
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
          Nueva Actividad
        </Button>
      </div>

      {/* Search / Filter bar */}
      <div className="flex items-center gap-4">
        <div className="w-full max-w-sm">
          <SearchInput
            placeholder="Buscar actividad por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />
        </div>
        {total > 0 && (
          <span className="text-sm text-neutral-500">
            {total} {total === 1 ? "actividad" : "actividades"}
          </span>
        )}
      </div>

      {/* Table card */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" label="Cargando actividades..." />
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
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            }
            title="Sin actividades"
            description={
              debouncedSearch
                ? "No se encontraron actividades con ese nombre. Intenta con otro término."
                : "Aún no hay actividades registradas. Crea la primera."
            }
            action={
              !debouncedSearch ? (
                <Button onClick={openCreate}>Nueva Actividad</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table<Actividad>
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
        title={editing ? "Editar Actividad" : "Nueva Actividad"}
        description={
          editing
            ? "Modifica los datos de la actividad"
            : "Completa los datos para crear una nueva actividad"
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Guardar Cambios" : "Crear Actividad"}
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
            placeholder="Ej: Yoga, Pilates, Spinning..."
            value={form.nombre}
            onChange={(e) => updateField("nombre", e.target.value)}
            error={errors.nombre}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Descripción
            </label>
            <textarea
              placeholder="Descripción de la actividad (opcional)"
              value={form.descripcion ?? ""}
              onChange={(e) => updateField("descripcion", e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 transition-colors duration-150 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cupo Máximo"
              type="number"
              min={1}
              placeholder="Ej: 20"
              value={form.cupo_maximo}
              onChange={(e) =>
                updateField("cupo_maximo", Number(e.target.value))
              }
              error={errors.cupo_maximo}
              required
            />

            <Input
              label="Duración (minutos)"
              type="number"
              min={1}
              placeholder="Ej: 60"
              value={form.duracion_min}
              onChange={(e) =>
                updateField("duracion_min", Number(e.target.value))
              }
              error={errors.duracion_min}
              required
            />
          </div>

          {editing && (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.activa ?? true}
                  onChange={(e) => updateField("activa", e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-neutral-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-500 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary-500/30" />
              </label>
              <div>
                <span className="text-sm font-medium text-neutral-700">
                  Actividad activa
                </span>
                <p className="text-xs text-neutral-500">
                  Las actividades inactivas no serán visibles para los socios
                </p>
              </div>
            </div>
          )}

          {/* Hidden submit for enter key */}
          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </div>
  );
}
