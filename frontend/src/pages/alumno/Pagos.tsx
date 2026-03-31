import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState, Badge, Button, Modal } from "../../components/ui";
import { planesAlumno } from "../../services/alumnoApi";
import api from "../../services/api";
import type { Plan } from "../../services/adminApi";

interface Pago {
  id: number;
  alumno_id: number;
  plan_id: number;
  monto: number;
  fecha_pago: string;
  fecha_vencimiento: string;
  estado: string;
  metodo_pago: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount);
}

const ESTADO_PAGO: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  aprobado: { label: "Aprobado", variant: "success" },
  pendiente: { label: "Pendiente", variant: "warning" },
  rechazado: { label: "Rechazado", variant: "danger" },
  vencido: { label: "Vencido", variant: "danger" },
};

const METODO_LABELS: Record<string, string> = {
  mercadopago: "Mercado Pago",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

export default function AlumnoPagos() {
  const { user } = useAuth();

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Plan selection modal
  const [showPlanes, setShowPlanes] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [pagosRes, planesRes] = await Promise.all([
        api.get(`/alumnos/${user!.id}/pagos`).catch(() => ({ data: { items: [] } })),
        planesAlumno.list(),
      ]);
      setPagos((pagosRes.data as { items: Pago[] }).items ?? []);
      setPlanes(planesRes.data.items);
    } catch {
      setError("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  const planMap = new Map(planes.map((p) => [p.id, p]));

  // Current membership: most recent approved payment
  const membresiaActiva = pagos
    .filter((p) => p.estado === "aprobado")
    .sort(
      (a, b) =>
        new Date(b.fecha_vencimiento).getTime() -
        new Date(a.fecha_vencimiento).getTime(),
    )[0];

  const membresiaVigente =
    membresiaActiva &&
    new Date(membresiaActiva.fecha_vencimiento) > new Date();

  const diasRestantes = membresiaActiva
    ? Math.max(
        0,
        Math.ceil(
          (new Date(membresiaActiva.fecha_vencimiento).getTime() -
            Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

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
          <h1 className="text-2xl font-bold text-neutral-900">Mis Pagos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Estado de membresía e historial de pagos
          </p>
        </div>
        <Button onClick={() => setShowPlanes(true)}>
          Renovar plan
        </Button>
      </div>

      {/* Membership status */}
      <div
        className={`rounded-xl border p-6 ${
          membresiaVigente
            ? "border-success-200 bg-success-50"
            : "border-warning-200 bg-warning-50"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldIcon
                className={`h-5 w-5 ${
                  membresiaVigente ? "text-success-600" : "text-warning-600"
                }`}
              />
              <h2
                className={`text-lg font-semibold ${
                  membresiaVigente ? "text-success-800" : "text-warning-800"
                }`}
              >
                {membresiaVigente ? "Membresía activa" : "Membresía inactiva"}
              </h2>
            </div>
            {membresiaActiva ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className={membresiaVigente ? "text-success-700" : "text-warning-700"}>
                  Plan: {planMap.get(membresiaActiva.plan_id)?.nombre ?? `#${membresiaActiva.plan_id}`}
                </p>
                <p className={membresiaVigente ? "text-success-700" : "text-warning-700"}>
                  Vence: {formatDate(membresiaActiva.fecha_vencimiento)}
                </p>
                {membresiaVigente && (
                  <p className="text-success-600 font-medium">
                    {diasRestantes} día{diasRestantes !== 1 ? "s" : ""} restante{diasRestantes !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-warning-700">
                No tenés una membresía activa. Elegí un plan para comenzar.
              </p>
            )}
          </div>
          {!membresiaVigente && (
            <Button size="sm" onClick={() => setShowPlanes(true)}>
              Elegir plan
            </Button>
          )}
        </div>
      </div>

      {/* Payment history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Historial de pagos
        </h2>

        {pagos.length === 0 ? (
          <Card>
            <EmptyState
              title="Sin pagos"
              description="No hay pagos registrados en tu cuenta."
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
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">Plan</th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">Monto</th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">Fecha</th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">Vencimiento</th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">Método</th>
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {pagos
                        .sort(
                          (a, b) =>
                            new Date(b.fecha_pago).getTime() -
                            new Date(a.fecha_pago).getTime(),
                        )
                        .map((pago) => {
                          const estado = ESTADO_PAGO[pago.estado] ?? {
                            label: pago.estado,
                            variant: "default" as const,
                          };
                          return (
                            <tr key={pago.id} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="px-5 py-4 font-medium text-neutral-900">
                                {planMap.get(pago.plan_id)?.nombre ?? `Plan #${pago.plan_id}`}
                              </td>
                              <td className="px-5 py-4 text-neutral-900 font-medium">
                                {formatCurrency(pago.monto)}
                              </td>
                              <td className="px-5 py-4 text-neutral-600">
                                {formatDate(pago.fecha_pago)}
                              </td>
                              <td className="px-5 py-4 text-neutral-600">
                                {formatDate(pago.fecha_vencimiento)}
                              </td>
                              <td className="px-5 py-4 text-neutral-600">
                                {METODO_LABELS[pago.metodo_pago ?? ""] ?? pago.metodo_pago ?? "—"}
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant={estado.variant}>{estado.label}</Badge>
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
              {pagos
                .sort(
                  (a, b) =>
                    new Date(b.fecha_pago).getTime() -
                    new Date(a.fecha_pago).getTime(),
                )
                .map((pago) => {
                  const estado = ESTADO_PAGO[pago.estado] ?? {
                    label: pago.estado,
                    variant: "default" as const,
                  };
                  return (
                    <Card key={pago.id}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-neutral-900">
                          {planMap.get(pago.plan_id)?.nombre ?? `Plan #${pago.plan_id}`}
                        </h3>
                        <Badge variant={estado.variant}>{estado.label}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-neutral-500">
                        <p className="text-lg font-bold text-neutral-900">
                          {formatCurrency(pago.monto)}
                        </p>
                        <p>Fecha: {formatDate(pago.fecha_pago)}</p>
                        <p>Vence: {formatDate(pago.fecha_vencimiento)}</p>
                        {pago.metodo_pago && (
                          <p>
                            {METODO_LABELS[pago.metodo_pago] ?? pago.metodo_pago}
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {/* Plan selection modal */}
      <Modal
        open={showPlanes}
        onClose={() => setShowPlanes(false)}
        title="Elegir plan"
        description="Seleccioná el plan que mejor se adapte a vos"
        size="lg"
      >
        {planes.length === 0 ? (
          <EmptyState
            title="Sin planes"
            description="No hay planes disponibles actualmente."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {planes.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 p-5 transition-all hover:border-primary-300 hover:shadow-sm"
              >
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">
                    {plan.nombre}
                  </h3>
                  {plan.descripcion && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {plan.descripcion}
                    </p>
                  )}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-primary-600">
                        {formatCurrency(plan.precio)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-500">
                      <span>{plan.duracion_dias} días</span>
                      <span className="text-neutral-300">·</span>
                      <span>{plan.max_actividades} actividades</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <Button size="sm" className="w-full">
                    Seleccionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}
