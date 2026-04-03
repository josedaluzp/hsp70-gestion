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
} from "../../components/ui";
import type { Column } from "../../components/ui";
import { planes, type Plan, type PlanForm } from "../../services/adminApi";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

const emptyForm: PlanForm = {
  nombre: "",
  descripcion: "",
  precio: 0,
  precio_suscripcion: null,
  duracion_dias: 1,
  max_actividades: 1,
};

interface FormErrors {
  nombre?: string;
  precio?: string;
  duracion_dias?: string;
  max_actividades?: string;
}

function validateForm(form: PlanForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.nombre.trim()) {
    errors.nombre = "El nombre es obligatorio";
  }
  if (form.precio < 0 || isNaN(form.precio)) {
    errors.precio = "El precio debe ser mayor o igual a 0";
  }
  if (form.duracion_dias < 1 || isNaN(form.duracion_dias)) {
    errors.duracion_dias = "La duración debe ser al menos 1 día";
  }
  if (form.max_actividades < 1 || isNaN(form.max_actividades)) {
    errors.max_actividades = "Debe permitir al menos 1 actividad";
  }

  return errors;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function truncate(text: string | null, maxLength: number): string {
  if (!text) return "—";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export default function Planes() {
  const [data, setData] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPlanes = useCallback(async (currentPage: number, query: string) => {
    setLoading(true);
    try {
      const res = await planes.list({
        page: currentPage,
        page_size: PAGE_SIZE,
        nombre: query || undefined,
      });
      const payload = res.data;
      setData(payload.items);
      setTotal(payload.total);
      setTotalPages(payload.pages);
    } catch {
      setData([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanes(page, search);
  }, [page, fetchPlanes]);

  function handleSearchChange(value: string) {
    setSearch(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchPlanes(1, value);
    }, DEBOUNCE_MS);
  }

  function handleClearSearch() {
    setSearch("");
    setPage(1);
    fetchPlanes(1, "");
  }

  function openCreateModal() {
    setEditingPlan(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(plan: Plan) {
    setEditingPlan(plan);
    setForm({
      nombre: plan.nombre,
      descripcion: plan.descripcion ?? "",
      precio: plan.precio,
      precio_suscripcion: plan.precio_suscripcion,
      duracion_dias: plan.duracion_dias,
      max_actividades: plan.max_actividades,
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingPlan(null);
    setForm(emptyForm);
    setErrors({});
  }

  function updateField<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const payload: PlanForm = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        precio: Number(form.precio),
        precio_suscripcion: form.precio_suscripcion != null ? Number(form.precio_suscripcion) : null,
        duracion_dias: Number(form.duracion_dias),
        max_actividades: Number(form.max_actividades),
      };

      if (editingPlan) {
        await planes.update(editingPlan.id, payload);
      } else {
        await planes.create(payload);
      }

      closeModal();
      fetchPlanes(editingPlan ? page : 1, search);
      if (!editingPlan) setPage(1);
    } catch {
      // Error handled by API interceptor
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: Plan) {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el plan "${plan.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await planes.delete(plan.id);
      const isLastItemOnPage = data.length === 1 && page > 1;
      const nextPage = isLastItemOnPage ? page - 1 : page;
      setPage(nextPage);
      fetchPlanes(nextPage, search);
    } catch {
      // Error handled by API interceptor
    }
  }

  const columns: Column<Plan>[] = [
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
      className: "max-w-xs",
      render: (row) => (
        <span className="text-neutral-500">{truncate(row.descripcion, 60)}</span>
      ),
    },
    {
      key: "precio",
      header: "Precio",
      sortable: true,
      render: (row) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.precio)}</span>
      ),
    },
    {
      key: "precio_suscripcion",
      header: "Precio Suscripción",
      render: (row) => (
        <span className="tabular-nums text-neutral-500">
          {row.precio_suscripcion != null ? formatCurrency(row.precio_suscripcion) : "—"}
        </span>
      ),
    },
    {
      key: "duracion_dias",
      header: "Duración",
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{row.duracion_dias} días</span>
      ),
    },
    {
      key: "max_actividades",
      header: "Max Actividades",
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{row.max_actividades}</span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "w-44",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditModal(row)}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(row)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Gestión de Planes
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {total} {total === 1 ? "plan" : "planes"} en total
          </p>
        </div>
        <Button onClick={openCreateModal}>Nuevo Plan</Button>
      </div>

      {/* Search bar */}
      <div className="max-w-sm">
        <SearchInput
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onClear={handleClearSearch}
        />
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" label="Cargando planes..." />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title={search ? "Sin resultados" : "No hay planes"}
            description={
              search
                ? "No se encontraron planes que coincidan con tu búsqueda."
                : "Aún no se ha creado ningún plan. Comienza creando uno."
            }
            action={
              !search ? (
                <Button onClick={openCreateModal}>Crear primer plan</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table<Plan>
              columns={columns}
              data={data}
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

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingPlan ? "Editar Plan" : "Nuevo Plan"}
        description={
          editingPlan
            ? "Modifica los datos del plan seleccionado."
            : "Completa los datos para crear un nuevo plan."
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="plan-form"
              loading={saving}
            >
              {editingPlan ? "Guardar Cambios" : "Crear Plan"}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label
              htmlFor="plan-nombre"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Nombre <span className="text-danger-500">*</span>
            </label>
            <input
              id="plan-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
              placeholder="Ej: Plan Mensual Premium"
              className={`
                block w-full rounded-lg border bg-white px-3 py-2 text-sm
                text-neutral-800 placeholder-neutral-400
                transition-colors duration-150 outline-none
                focus:ring-2 focus:ring-offset-0
                ${
                  errors.nombre
                    ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30"
                    : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30"
                }
              `}
            />
            {errors.nombre && (
              <p className="mt-1.5 text-xs text-danger-500">{errors.nombre}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="plan-descripcion"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Descripción
            </label>
            <textarea
              id="plan-descripcion"
              value={form.descripcion ?? ""}
              onChange={(e) => updateField("descripcion", e.target.value)}
              placeholder="Descripción opcional del plan..."
              rows={3}
              className="
                block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm
                text-neutral-800 placeholder-neutral-400
                transition-colors duration-150 outline-none
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0
                resize-none
              "
            />
          </div>

          {/* Precio + Duración row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="plan-precio"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Precio ($) <span className="text-danger-500">*</span>
              </label>
              <input
                id="plan-precio"
                type="number"
                min={0}
                step="0.01"
                value={form.precio}
                onChange={(e) =>
                  updateField("precio", parseFloat(e.target.value) || 0)
                }
                className={`
                  block w-full rounded-lg border bg-white px-3 py-2 text-sm
                  text-neutral-800 placeholder-neutral-400
                  transition-colors duration-150 outline-none
                  focus:ring-2 focus:ring-offset-0
                  ${
                    errors.precio
                      ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30"
                      : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30"
                  }
                `}
              />
              {errors.precio && (
                <p className="mt-1.5 text-xs text-danger-500">{errors.precio}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="plan-duracion"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Duración (días) <span className="text-danger-500">*</span>
              </label>
              <input
                id="plan-duracion"
                type="number"
                min={1}
                step={1}
                value={form.duracion_dias}
                onChange={(e) =>
                  updateField("duracion_dias", parseInt(e.target.value, 10) || 1)
                }
                className={`
                  block w-full rounded-lg border bg-white px-3 py-2 text-sm
                  text-neutral-800 placeholder-neutral-400
                  transition-colors duration-150 outline-none
                  focus:ring-2 focus:ring-offset-0
                  ${
                    errors.duracion_dias
                      ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30"
                      : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30"
                  }
                `}
              />
              {errors.duracion_dias && (
                <p className="mt-1.5 text-xs text-danger-500">
                  {errors.duracion_dias}
                </p>
              )}
            </div>
          </div>

          {/* Precio suscripción */}
          <div className="max-w-[calc(50%-0.5rem)]">
            <label
              htmlFor="plan-precio-suscripcion"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Precio Suscripción ($)
              <span className="ml-1.5 text-xs font-normal text-neutral-400">(opcional)</span>
            </label>
            <input
              id="plan-precio-suscripcion"
              type="number"
              min={0}
              step="0.01"
              value={form.precio_suscripcion ?? ""}
              onChange={(e) =>
                updateField(
                  "precio_suscripcion",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="Dejar vacío si no ofrece suscripción"
              className="
                block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm
                text-neutral-800 placeholder-neutral-400
                transition-colors duration-150 outline-none
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0
              "
            />
          </div>

          {/* Max actividades */}
          <div className="max-w-[calc(50%-0.5rem)]">
            <label
              htmlFor="plan-max-actividades"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Max Actividades <span className="text-danger-500">*</span>
            </label>
            <input
              id="plan-max-actividades"
              type="number"
              min={1}
              step={1}
              value={form.max_actividades}
              onChange={(e) =>
                updateField(
                  "max_actividades",
                  parseInt(e.target.value, 10) || 1
                )
              }
              className={`
                block w-full rounded-lg border bg-white px-3 py-2 text-sm
                text-neutral-800 placeholder-neutral-400
                transition-colors duration-150 outline-none
                focus:ring-2 focus:ring-offset-0
                ${
                  errors.max_actividades
                    ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30"
                    : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30"
                }
              `}
            />
            {errors.max_actividades && (
              <p className="mt-1.5 text-xs text-danger-500">
                {errors.max_actividades}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
