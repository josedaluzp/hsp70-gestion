import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState, Badge, Button, Modal } from "../../components/ui";
import { planesAlumno, mercadopago } from "../../services/alumnoApi";
import type { Pago } from "../../services/alumnoApi";
import api from "../../services/api";
import type { Plan } from "../../services/adminApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function calcSavingsPercent(precio: number, precioSub: number): number {
  if (precio <= 0) return 0;
  return Math.round(((precio - precioSub) / precio) * 100);
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

const TIPO_PAGO_LABELS: Record<string, string> = {
  unico: "Pago único",
  suscripcion: "Suscripción",
};

type PaymentStatus = "approved" | "pending" | "failure";

const STATUS_BANNERS: Record<PaymentStatus, { message: string; classes: string }> = {
  approved: {
    message: "Pago aprobado. Tu membresía está activa.",
    classes: "border-success-200 bg-success-50 text-success-700",
  },
  pending: {
    message: "Tu pago está siendo procesado. Te avisaremos cuando se confirme.",
    classes: "border-warning-200 bg-warning-50 text-warning-700",
  },
  failure: {
    message: "El pago no se pudo procesar. Podés intentar de nuevo.",
    classes: "border-danger-200 bg-danger-50 text-danger-700",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlumnoPagos() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment status banner from URL
  const [statusBanner, setStatusBanner] = useState<PaymentStatus | null>(null);

  // Plan selection modal
  const [showPlanes, setShowPlanes] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Cancel subscription modal
  const [cancelTarget, setCancelTarget] = useState<Pago | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // ── Read ?status from URL ────────────────────────────────────────────────
  useEffect(() => {
    const status = searchParams.get("status") as PaymentStatus | null;
    if (status && status in STATUS_BANNERS) {
      setStatusBanner(status);
      // Clear the query param from URL without navigation
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-clear banner after 8 seconds
  useEffect(() => {
    if (!statusBanner) return;
    const timer = setTimeout(() => setStatusBanner(null), 8000);
    return () => clearTimeout(timer);
  }, [statusBanner]);

  // ── Fetch data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [pagosRes, planesRes] = await Promise.all([
        api.get(`/alumnos/${user.id}/pagos`).catch(() => ({ data: { items: [] } })),
        planesAlumno.list(),
      ]);
      setPagos((pagosRes.data as { items: Pago[] }).items ?? []);
      setPlanes(planesRes.data.items);
    } catch {
      setError("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived state ────────────────────────────────────────────────────────
  const planMap = new Map(planes.map((p) => [p.id, p]));

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
          (new Date(membresiaActiva.fecha_vencimiento).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const hasActiveSubscription =
    membresiaActiva &&
    membresiaActiva.tipo_pago === "suscripcion" &&
    membresiaActiva.estado === "aprobado" &&
    membresiaActiva.mp_subscription_id != null;

  // ── Payment handlers ────────────────────────────────────────────────────
  async function handlePagoUnico(plan: Plan) {
    setPaying(true);
    setPayError(null);
    try {
      const res = await mercadopago.crearPreferencia(plan.id);
      window.location.href = res.data.checkout_url;
    } catch {
      setPayError("No se pudo iniciar el pago. Intentá de nuevo.");
      setPaying(false);
    }
  }

  async function handleSuscripcion(plan: Plan) {
    setPaying(true);
    setPayError(null);
    try {
      const res = await mercadopago.crearSuscripcion(plan.id);
      window.location.href = res.data.checkout_url;
    } catch {
      setPayError("No se pudo iniciar la suscripción. Intentá de nuevo.");
      setPaying(false);
    }
  }

  async function handleCancelSubscription() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await mercadopago.cancelarSuscripcion(cancelTarget.id);
      setCancelTarget(null);
      await fetchData();
    } catch {
      setPayError("No se pudo cancelar la suscripción. Intentá de nuevo.");
    } finally {
      setCancelling(false);
    }
  }

  function closePlanModal() {
    setShowPlanes(false);
    setSelectedPlan(null);
    setPayError(null);
    setPaying(false);
  }

  // ── Loading / Error ──────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Payment status banner */}
      {statusBanner && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 transition-opacity duration-300 ${STATUS_BANNERS[statusBanner].classes}`}
        >
          <StatusIcon status={statusBanner} />
          <p className="text-sm font-medium">
            {STATUS_BANNERS[statusBanner].message}
          </p>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="ml-auto shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Cerrar"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page header */}
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

      {/* Membership status card */}
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
              {hasActiveSubscription && (
                <Badge variant="success">Débito automático activo</Badge>
              )}
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
          <div className="flex shrink-0 flex-col gap-2">
            {!membresiaVigente && (
              <Button size="sm" onClick={() => setShowPlanes(true)}>
                Elegir plan
              </Button>
            )}
            {hasActiveSubscription && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelTarget(membresiaActiva)}
              >
                Cancelar suscripción
              </Button>
            )}
          </div>
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
                        <th className="px-5 py-3 text-left font-medium text-neutral-500">Tipo</th>
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
                                {TIPO_PAGO_LABELS[pago.tipo_pago] ?? pago.tipo_pago}
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
                        <p>Tipo: {TIPO_PAGO_LABELS[pago.tipo_pago] ?? pago.tipo_pago}</p>
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

      {/* ── Plan selection modal ───────────────────────────────────────────── */}
      <Modal
        open={showPlanes}
        onClose={closePlanModal}
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
          <div className="space-y-6">
            {/* Plan cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {planes.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                const savings = plan.precio_suscripcion
                  ? calcSavingsPercent(plan.precio, plan.precio_suscripcion)
                  : 0;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setPayError(null);
                    }}
                    className={`flex flex-col justify-between rounded-xl border-2 p-5 text-left transition-all ${
                      isSelected
                        ? "border-primary-500 bg-primary-50/40 shadow-sm ring-1 ring-primary-500/20"
                        : "border-neutral-200 hover:border-primary-300 hover:shadow-sm"
                    }`}
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
                          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                            Pago único
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-primary-600">
                            {formatCurrency(plan.precio)}
                          </span>
                        </div>
                        {plan.precio_suscripcion != null && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold text-neutral-700">
                              {formatCurrency(plan.precio_suscripcion)}/mes
                            </span>
                            {savings > 0 && (
                              <Badge variant="success">
                                Ahorrás {savings}%
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-sm text-neutral-500">
                      <span>{plan.duracion_dias} días</span>
                      <span className="text-neutral-300">·</span>
                      <span>{plan.max_actividades} actividades</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Payment method section (appears after selecting a plan) */}
            {selectedPlan && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700">
                  Método de pago para {selectedPlan.nombre}
                </h4>

                {payError && (
                  <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-600">
                    {payError}
                  </div>
                )}

                {paying ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Spinner size="lg" />
                    <p className="text-sm text-neutral-500">
                      Redirigiendo a MercadoPago...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => handlePagoUnico(selectedPlan)}
                    >
                      Pagar {formatCurrency(selectedPlan.precio)} con MercadoPago
                    </Button>

                    {selectedPlan.precio_suscripcion != null && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSuscripcion(selectedPlan)}
                      >
                        Suscribirme por {formatCurrency(selectedPlan.precio_suscripcion)}/mes
                      </Button>
                    )}

                    <p className="text-center text-xs text-neutral-400">
                      También podés pagar en persona en recepción
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Cancel subscription modal ──────────────────────────────────────── */}
      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancelar suscripción"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Volver
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancelSubscription}>
              Sí, cancelar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Tu membresía seguirá activa hasta{" "}
            <span className="font-semibold text-neutral-900">
              {cancelTarget ? formatDate(cancelTarget.fecha_vencimiento) : ""}
            </span>{" "}
            pero no se renovará automáticamente.
          </p>
          <p className="text-sm text-neutral-500">
            Podés volver a suscribirte en cualquier momento desde esta página.
          </p>
        </div>
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

function StatusIcon({ status }: { status: PaymentStatus }) {
  const iconMap: Record<PaymentStatus, { path: string; className: string }> = {
    approved: {
      path: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      className: "h-5 w-5 text-success-600",
    },
    pending: {
      path: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      className: "h-5 w-5 text-warning-600",
    },
    failure: {
      path: "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      className: "h-5 w-5 text-danger-600",
    },
  };

  const icon = iconMap[status];
  return (
    <svg className={icon.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
