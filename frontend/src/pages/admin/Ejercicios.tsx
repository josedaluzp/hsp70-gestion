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
import { ejerciciosApi } from "../../services/rutinaApi";
import type { Ejercicio, EjercicioForm } from "../../services/rutinaApi";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 400;

const EMPTY_FORM: EjercicioForm = {
  nombre: "",
  video_url: "",
};

interface FormErrors {
  nombre?: string;
  video_url?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Ejercicios() {
  // List state
  const [data, setData] = useState<Ejercicio[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ejercicio | null>(null);
  const [form, setForm] = useState<EjercicioForm>(EMPTY_FORM);
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
      const res = await ejerciciosApi.list(params);
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

  function validate(values: EjercicioForm): FormErrors {
    const errs: FormErrors = {};
    if (!values.nombre.trim()) {
      errs.nombre = "El nombre es obligatorio";
    }
    if (!values.video_url.trim()) {
      errs.video_url = "La URL del video es obligatoria";
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

  function openEdit(ejercicio: Ejercicio) {
    setEditing(ejercicio);
    setForm({
      nombre: ejercicio.nombre,
      video_url: ejercicio.video_url,
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
      const payload: EjercicioForm = {
        nombre: form.nombre.trim(),
        video_url: form.video_url.trim(),
      };

      if (editing) {
        await ejerciciosApi.update(editing.id, payload);
      } else {
        await ejerciciosApi.create(payload);
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

  async function handleDelete(ejercicio: Ejercicio) {
    const confirmed = window.confirm(
      `¿Estas seguro de que deseas eliminar el ejercicio "${ejercicio.nombre}"?`,
    );
    if (!confirmed) return;

    try {
      await ejerciciosApi.delete(ejercicio.id);
      await fetchData();
    } catch {
      // Error is handled by global interceptor
    }
  }

  // ─── Form field updater ──────────────────────────────────────────────────

  function updateField<K extends keyof EjercicioForm>(
    key: K,
    value: EjercicioForm[K],
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

  const columns: Column<Ejercicio>[] = [
    {
      key: "nombre",
      header: "Nombre",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-neutral-900">{row.nombre}</span>
      ),
    },
    {
      key: "video_url",
      header: "Video URL",
      className: "max-w-[300px]",
      render: (row) => (
        <span className="block truncate text-neutral-500">
          {row.video_url}
        </span>
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
            Gestion de Ejercicios
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Administra los ejercicios disponibles para las rutinas
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
          Nuevo Ejercicio
        </Button>
      </div>

      {/* Search / Filter bar */}
      <div className="flex items-center gap-4">
        <div className="w-full max-w-sm">
          <SearchInput
            placeholder="Buscar ejercicio por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />
        </div>
        {total > 0 && (
          <span className="text-sm text-neutral-500">
            {total} {total === 1 ? "ejercicio" : "ejercicios"}
          </span>
        )}
      </div>

      {/* Table card */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" label="Cargando ejercicios..." />
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
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
            }
            title="Sin ejercicios"
            description={
              debouncedSearch
                ? "No se encontraron ejercicios con ese nombre. Intenta con otro termino."
                : "Aun no hay ejercicios registrados. Crea el primero."
            }
            action={
              !debouncedSearch ? (
                <Button onClick={openCreate}>Nuevo Ejercicio</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table<Ejercicio>
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
        title={editing ? "Editar Ejercicio" : "Nuevo Ejercicio"}
        description={
          editing
            ? "Modifica los datos del ejercicio"
            : "Completa los datos para crear un nuevo ejercicio"
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Guardar Cambios" : "Crear Ejercicio"}
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
            placeholder="Ej: Sentadillas, Press de banca..."
            value={form.nombre}
            onChange={(e) => updateField("nombre", e.target.value)}
            error={errors.nombre}
            required
          />

          <Input
            label="Video URL"
            placeholder="https://youtube.com/watch?v=..."
            value={form.video_url}
            onChange={(e) => updateField("video_url", e.target.value)}
            error={errors.video_url}
            required
          />

          {/* Hidden submit for enter key */}
          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </div>
  );
}
