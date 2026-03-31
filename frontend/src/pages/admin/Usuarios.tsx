import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Card,
  Input,
  Select,
  SearchInput,
  Table,
  Modal,
  Badge,
  Spinner,
  EmptyState,
  Pagination,
} from "../../components/ui";
import type { Column } from "../../components/ui";
import {
  usuarios,
  type User,
  type UserUpdate,
} from "../../services/adminApi";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

const ROLE_OPTIONS = [
  { value: "alumno", label: "Alumno" },
  { value: "profesor", label: "Profesor" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "admin", label: "Admin" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Todos los roles" },
  ...ROLE_OPTIONS,
];

const ACTIVE_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

const ROLE_BADGE_VARIANT: Record<string, "primary" | "accent" | "warning" | "default"> = {
  admin: "primary",
  profesor: "accent",
  recepcionista: "warning",
  alumno: "default",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRolLabel(rol: string): string {
  return rol.charAt(0).toUpperCase() + rol.slice(1);
}

// ─── Edit Form State ─────────────────────────────────────────────────────────

interface EditFormState {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni: string;
  rol: string;
}

interface EditFormErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
}

function userToFormState(user: User): EditFormState {
  return {
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    telefono: user.telefono ?? "",
    dni: user.dni ?? "",
    rol: user.rol,
  };
}

function validateForm(form: EditFormState): EditFormErrors {
  const errors: EditFormErrors = {};

  if (!form.nombre.trim()) {
    errors.nombre = "El nombre es obligatorio";
  }

  if (!form.apellido.trim()) {
    errors.apellido = "El apellido es obligatorio";
  }

  if (!form.email.trim()) {
    errors.email = "El email es obligatorio";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Ingrese un email valido";
  }

  return errors;
}

function hasErrors(errors: EditFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Usuarios() {
  // Data state
  const [userList, setUserList] = useState<User[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rolFilter, setRolFilter] = useState("");
  const [activoFilter, setActivoFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    dni: "",
    rol: "alumno",
  });
  const [formErrors, setFormErrors] = useState<EditFormErrors>({});
  const [saving, setSaving] = useState(false);

  // Toggle loading state (track per-user)
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Debounced search ─────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  // ── Fetch users ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        page_size: PAGE_SIZE,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (rolFilter) {
        params.rol = rolFilter;
      }
      if (activoFilter) {
        params.activo = activoFilter === "true";
      }

      const response = await usuarios.list(params as Parameters<typeof usuarios.list>[0]);
      const data = response.data;
      setUserList(data.items);
      setTotalPages(data.pages);
      setTotalItems(data.total);
    } catch {
      setError("No se pudieron cargar los usuarios. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, rolFilter, activoFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleClearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setCurrentPage(1);
  }

  function handleRolFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRolFilter(e.target.value);
    setCurrentPage(1);
  }

  function handleActivoFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setActivoFilter(e.target.value);
    setCurrentPage(1);
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditForm(userToFormState(user));
    setFormErrors({});
  }

  function closeEditModal() {
    setEditingUser(null);
    setFormErrors({});
  }

  function handleFormChange(field: keyof EditFormState, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (formErrors[field as keyof EditFormErrors]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof EditFormErrors];
        return next;
      });
    }
  }

  async function handleSaveEdit() {
    const errors = validateForm(editForm);
    setFormErrors(errors);

    if (hasErrors(errors) || !editingUser) return;

    setSaving(true);

    try {
      const updateData: UserUpdate = {
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        email: editForm.email.trim(),
        telefono: editForm.telefono.trim() || null,
        dni: editForm.dni.trim() || null,
        rol: editForm.rol,
      };

      const response = await usuarios.update(editingUser.id, updateData);

      // Update the user in the local list
      setUserList((prev) =>
        prev.map((u) => (u.id === editingUser.id ? response.data : u))
      );

      closeEditModal();
    } catch {
      setFormErrors({ nombre: "Error al guardar los cambios. Intente nuevamente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActivo(user: User) {
    setTogglingId(user.id);

    try {
      const response = await usuarios.toggleActivo(user.id);

      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? response.data : u))
      );
    } catch {
      setError("No se pudo cambiar el estado del usuario.");
    } finally {
      setTogglingId(null);
    }
  }

  // ── Table columns ────────────────────────────────────────────────────────

  const columns: Column<User>[] = [
    {
      key: "nombre",
      header: "Nombre",
      sortable: true,
      render: (user) => (
        <div>
          <span className="font-medium text-neutral-900">
            {user.nombre} {user.apellido}
          </span>
          <p className="text-xs text-neutral-500 mt-0.5">{user.email}</p>
        </div>
      ),
    },
    {
      key: "dni",
      header: "DNI",
      render: (user) => (
        <span className="text-neutral-600">
          {user.dni ?? <span className="text-neutral-400">-</span>}
        </span>
      ),
    },
    {
      key: "telefono",
      header: "Telefono",
      render: (user) => (
        <span className="text-neutral-600">
          {user.telefono ?? <span className="text-neutral-400">-</span>}
        </span>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      sortable: true,
      render: (user) => (
        <Badge variant={ROLE_BADGE_VARIANT[user.rol] ?? "default"}>
          {formatRolLabel(user.rol)}
        </Badge>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (user) => (
        <Badge variant={user.activo ? "success" : "danger"}>
          {user.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (user) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditModal(user)}
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
            variant={user.activo ? "secondary" : "primary"}
            size="sm"
            loading={togglingId === user.id}
            onClick={() => handleToggleActivo(user)}
          >
            {user.activo ? "Desactivar" : "Activar"}
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Gestion de Usuarios
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Administre los usuarios del sistema, sus roles y estados.
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0 sm:max-w-xs">
          <SearchInput
            placeholder="Buscar por nombre, email o DNI..."
            value={search}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={ROLE_FILTER_OPTIONS}
            value={rolFilter}
            onChange={handleRolFilterChange}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            options={ACTIVE_FILTER_OPTIONS}
            value={activoFilter}
            onChange={handleActivoFilterChange}
          />
        </div>
        {totalItems > 0 && !loading && (
          <div className="hidden sm:block text-sm text-neutral-500 whitespace-nowrap ml-auto">
            {totalItems} usuario{totalItems !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-danger-500 hover:text-danger-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" label="Cargando usuarios..." />
          </div>
        ) : userList.length === 0 ? (
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            }
            title="No se encontraron usuarios"
            description={
              debouncedSearch || rolFilter || activoFilter
                ? "Intente ajustar los filtros de busqueda."
                : "Aun no hay usuarios registrados en el sistema."
            }
            action={
              (debouncedSearch || rolFilter || activoFilter) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setRolFilter("");
                    setActivoFilter("");
                    setCurrentPage(1);
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table<User>
              columns={columns}
              data={userList}
              keyExtractor={(user) => user.id}
            />
            <div className="border-t border-neutral-100 px-4 py-3">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        open={editingUser !== null}
        onClose={closeEditModal}
        title="Editar Usuario"
        description={
          editingUser
            ? `${editingUser.nombre} ${editingUser.apellido}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeEditModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              loading={saving}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            value={editForm.nombre}
            onChange={(e) => handleFormChange("nombre", e.target.value)}
            error={formErrors.nombre}
            placeholder="Nombre"
            required
          />
          <Input
            label="Apellido"
            value={editForm.apellido}
            onChange={(e) => handleFormChange("apellido", e.target.value)}
            error={formErrors.apellido}
            placeholder="Apellido"
            required
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => handleFormChange("email", e.target.value)}
            error={formErrors.email}
            placeholder="correo@ejemplo.com"
            required
          />
          <Input
            label="Telefono"
            type="tel"
            value={editForm.telefono}
            onChange={(e) => handleFormChange("telefono", e.target.value)}
            placeholder="Numero de telefono"
          />
          <Input
            label="DNI"
            value={editForm.dni}
            onChange={(e) => handleFormChange("dni", e.target.value)}
            placeholder="Documento de identidad"
          />
          <Select
            label="Rol"
            options={ROLE_OPTIONS}
            value={editForm.rol}
            onChange={(e) => handleFormChange("rol", e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
