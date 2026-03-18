import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Badge,
  Input,
  Select,
  SearchInput,
  Spinner,
  EmptyState,
  Pagination,
  Table,
  Modal,
} from "@/components/ui";
import type { Column } from "@/components/ui";

interface Patient {
  id: number;
  name: string;
  status: string;
  nextVisit: string;
  [key: string]: unknown;
}

const SAMPLE_PATIENTS: Patient[] = [
  { id: 1, name: "María García", status: "Activo", nextVisit: "2026-03-20" },
  { id: 2, name: "Carlos López", status: "Activo", nextVisit: "2026-03-22" },
  { id: 3, name: "Ana Martínez", status: "Pendiente", nextVisit: "2026-03-25" },
  { id: 4, name: "José Rodríguez", status: "Inactivo", nextVisit: "—" },
];

const COLUMNS: Column<Patient>[] = [
  { key: "name", header: "Nombre", sortable: true },
  {
    key: "status",
    header: "Estado",
    sortable: true,
    render: (row) => (
      <Badge
        variant={
          row.status === "Activo"
            ? "success"
            : row.status === "Pendiente"
              ? "warning"
              : "default"
        }
      >
        {row.status}
      </Badge>
    ),
  },
  { key: "nextVisit", header: "Próxima visita", sortable: true },
];

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-neutral-500">
          Bienvenido al sistema de gestión HSP-70.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-medium text-neutral-500">Pacientes activos</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">128</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Citas hoy</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">12</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Pendientes</p>
          <p className="mt-1 text-2xl font-semibold text-warning-600">5</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Ingresos mes</p>
          <p className="mt-1 text-2xl font-semibold text-primary-600">$24,500</p>
        </Card>
      </div>

      {/* Patients table */}
      <Card padding="none">
        <div className="p-6 pb-0">
          <CardHeader
            title="Pacientes recientes"
            description="Últimos pacientes registrados en el sistema."
            action={
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Nuevo paciente
              </Button>
            }
          />
        </div>

        <div className="mt-4 flex items-center gap-3 px-6">
          <div className="w-64">
            <SearchInput
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
            />
          </div>
          <Select
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Activos" },
              { value: "pending", label: "Pendientes" },
              { value: "inactive", label: "Inactivos" },
            ]}
            defaultValue="all"
          />
        </div>

        <div className="mt-4">
          <Table
            columns={COLUMNS}
            data={SAMPLE_PATIENTS}
            keyExtractor={(row) => row.id}
          />
        </div>

        <div className="border-t border-neutral-100 px-6 py-4">
          <Pagination
            currentPage={page}
            totalPages={5}
            onPageChange={setPage}
          />
        </div>
      </Card>

      {/* Component showcase section */}
      <Card>
        <CardHeader title="Componentes UI" description="Estado del sistema de diseño." />

        <div className="mt-6 space-y-8">
          {/* Buttons */}
          <div>
            <h3 className="mb-3">Botones</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" loading>Cargando</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h3 className="mb-3">Badges</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Activo</Badge>
              <Badge variant="warning">Pendiente</Badge>
              <Badge variant="danger">Error</Badge>
              <Badge variant="accent">Info</Badge>
            </div>
          </div>

          {/* Form inputs */}
          <div>
            <h3 className="mb-3">Formularios</h3>
            <div className="grid max-w-lg gap-4">
              <Input
                label="Nombre completo"
                placeholder="Ingrese el nombre"
                helperText="Nombre y apellido del paciente."
              />
              <Input
                label="Email"
                type="email"
                placeholder="email@ejemplo.com"
                error="El email no es válido."
              />
              <Select
                label="Tipo de sesión"
                placeholder="Seleccione..."
                options={[
                  { value: "individual", label: "Individual" },
                  { value: "group", label: "Grupal" },
                  { value: "family", label: "Familiar" },
                ]}
              />
            </div>
          </div>

          {/* Spinner */}
          <div>
            <h3 className="mb-3">Spinner</h3>
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </div>

          {/* Empty state */}
          <div>
            <h3 className="mb-3">Estado vacío</h3>
            <EmptyState
              title="Sin resultados"
              description="No se encontraron registros con los filtros aplicados."
              action={<Button variant="outline" size="sm">Limpiar filtros</Button>}
            />
          </div>
        </div>
      </Card>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo paciente"
        description="Complete los datos para registrar un paciente."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre completo" placeholder="Nombre y apellido" />
          <Input label="Teléfono" type="tel" placeholder="+54 11 1234-5678" />
          <Select
            label="Tipo de sesión"
            placeholder="Seleccione..."
            options={[
              { value: "individual", label: "Individual" },
              { value: "group", label: "Grupal" },
              { value: "family", label: "Familiar" },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
