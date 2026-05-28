import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, Badge, Button, Input, Modal } from "../../components/ui";
import { misEvaluaciones, perfil } from "../../services/alumnoApi";
import type { PerfilUpdate } from "../../services/alumnoApi";
import type { EvaluacionSalud } from "../../services/profesorApi";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

function calcIMC(pesoKg: number, alturaCm: number): number | null {
  if (pesoKg <= 0 || alturaCm <= 0) return null;
  const alturaM = alturaCm / 100;
  return Math.round((pesoKg / (alturaM * alturaM)) * 10) / 10;
}

function imcCategoria(imc: number): { label: string; variant: "success" | "warning" | "danger" | "accent" } {
  if (imc < 18.5) return { label: "Bajo peso", variant: "accent" };
  if (imc < 25) return { label: "Normal", variant: "success" };
  if (imc < 30) return { label: "Sobrepeso", variant: "warning" };
  return { label: "Obesidad", variant: "danger" };
}

export default function AlumnoPerfil() {
  const { user, refreshUser: fetchUser } = useAuth();

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionSalud[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(true);

  // Profile edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileForm, setProfileForm] = useState<PerfilUpdate>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoadingEvals(true);
      try {
        const res = await misEvaluaciones.list(user!.id);
        setEvaluaciones(res.data);
      } catch {
        setEvaluaciones([]);
      } finally {
        setLoadingEvals(false);
      }
    }

    load();
  }, [user]);

  function openEditProfile() {
    if (!user) return;
    setProfileForm({
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      dni: user.dni,
      fecha_nacimiento: user.fecha_nacimiento,
    });
    setProfileMsg(null);
    setShowEditModal(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileMsg(null);

    try {
      await perfil.update(user.id, profileForm);
      await fetchUser();
      setProfileMsg({ type: "success", text: "Perfil actualizado correctamente." });
      setShowEditModal(false);
    } catch {
      setProfileMsg({ type: "error", text: "No se pudo actualizar el perfil." });
    } finally {
      setSavingProfile(false);
    }
  }

  // Chart data
  const sortedEvals = useMemo(
    () =>
      [...evaluaciones].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      ),
    [evaluaciones],
  );

  const chartData = useMemo(
    () =>
      sortedEvals.map((ev) => ({
        fecha: formatShortDate(ev.fecha),
        peso: ev.peso_kg,
        imc: ev.imc ?? (ev.peso_kg && ev.altura_cm ? calcIMC(ev.peso_kg, ev.altura_cm) : null),
      })),
    [sortedEvals],
  );

  const latestEval = sortedEvals[sortedEvals.length - 1] ?? null;
  const latestIMC = latestEval
    ? latestEval.imc ?? (latestEval.peso_kg && latestEval.altura_cm
        ? calcIMC(latestEval.peso_kg, latestEval.altura_cm)
        : null)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mi Perfil</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Datos personales y evaluaciones de salud
        </p>
      </div>

      {profileMsg && !showEditModal && (
        <div
          className={`rounded-lg p-3 text-sm ${
            profileMsg.type === "success"
              ? "bg-success-50 text-success-700 border border-success-200"
              : "bg-danger-50 text-danger-600 border border-danger-200"
          }`}
        >
          {profileMsg.text}
        </div>
      )}

      {/* Personal info */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
              {user ? `${user.nombre[0]}${user.apellido[0]}`.toUpperCase() : ""}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {user?.nombre} {user?.apellido}
              </h2>
              <p className="text-sm text-neutral-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openEditProfile}>
            Editar
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField label="Email" value={user?.email ?? "—"} />
          <InfoField label="Teléfono" value={user?.telefono ?? "No registrado"} />
          <InfoField label="DNI" value={user?.dni ?? "No registrado"} />
          <InfoField
            label="Fecha de nacimiento"
            value={user?.fecha_nacimiento ? formatDate(user.fecha_nacimiento) : "No registrada"}
          />
        </div>
      </Card>

      {/* Health evaluations */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Evaluaciones de salud
        </h2>

        {loadingEvals ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : evaluaciones.length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <HeartIcon className="mx-auto h-12 w-12 text-neutral-300" />
              <h3 className="mt-4 text-base font-semibold text-neutral-900">
                Sin evaluaciones
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Todavía no tenés evaluaciones de salud registradas.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Latest metrics */}
            {latestEval && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Peso actual"
                  value={latestEval.peso_kg ? `${latestEval.peso_kg} kg` : "—"}
                  color="default"
                />
                <MetricCard
                  label="Altura"
                  value={latestEval.altura_cm ? `${latestEval.altura_cm} cm` : "—"}
                  color="default"
                />
                <MetricCard
                  label="IMC"
                  value={latestIMC ? String(latestIMC) : "—"}
                  color="primary"
                  badge={
                    latestIMC ? (
                      <Badge variant={imcCategoria(latestIMC).variant}>
                        {imcCategoria(latestIMC).label}
                      </Badge>
                    ) : undefined
                  }
                />
                <MetricCard
                  label="Grasa corporal"
                  value={
                    latestEval.grasa_corporal != null
                      ? `${latestEval.grasa_corporal}%`
                      : "—"
                  }
                  color="accent"
                />
              </div>
            )}

            {/* Evolution charts */}
            {chartData.length >= 2 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 text-base font-semibold text-neutral-900">
                    Evolución del peso
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="fecha"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          domain={["auto", "auto"]}
                          unit=" kg"
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "0.5rem",
                            border: "1px solid #e5e7eb",
                            fontSize: "0.875rem",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="peso"
                          name="Peso (kg)"
                          stroke="#16a34a"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#16a34a" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <h3 className="mb-4 text-base font-semibold text-neutral-900">
                    Evolución del IMC
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="fecha"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "0.5rem",
                            border: "1px solid #e5e7eb",
                            fontSize: "0.875rem",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="imc"
                          name="IMC"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#0ea5e9" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}

            {/* Evaluation history */}
            <div>
              <h3 className="mb-4 text-base font-semibold text-neutral-900">
                Historial completo
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {sortedEvals
                  .slice()
                  .reverse()
                  .map((ev) => {
                    const imc =
                      ev.imc ??
                      (ev.peso_kg && ev.altura_cm
                        ? calcIMC(ev.peso_kg, ev.altura_cm)
                        : null);
                    return (
                      <Card key={ev.id}>
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="text-sm text-neutral-500">
                            {formatDate(ev.fecha)}
                          </div>
                          {imc && (
                            <Badge variant={imcCategoria(imc).variant}>
                              IMC {imc} — {imcCategoria(imc).label}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <EvalMetric
                            label="Peso"
                            value={ev.peso_kg ? `${ev.peso_kg} kg` : "—"}
                          />
                          <EvalMetric
                            label="Altura"
                            value={ev.altura_cm ? `${ev.altura_cm} cm` : "—"}
                          />
                          <EvalMetric label="IMC" value={imc ? String(imc) : "—"} />
                          <EvalMetric
                            label="Grasa"
                            value={
                              ev.grasa_corporal != null
                                ? `${ev.grasa_corporal}%`
                                : "—"
                            }
                          />
                        </div>
                        {ev.objetivo && (
                          <div className="mt-4 pt-3 border-t border-neutral-100">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                              Objetivo
                            </p>
                            <p className="mt-1 text-sm text-neutral-700">
                              {ev.objetivo}
                            </p>
                          </div>
                        )}
                        {ev.notas && (
                          <div className="mt-3 pt-3 border-t border-neutral-100">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                              Notas
                            </p>
                            <p className="mt-1 text-sm text-neutral-700">
                              {ev.notas}
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit profile modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar perfil"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} loading={savingProfile}>
              Guardar
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileMsg && (
            <div
              className={`rounded-lg p-3 text-sm ${
                profileMsg.type === "success"
                  ? "bg-success-50 text-success-700"
                  : "bg-danger-50 text-danger-600"
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={profileForm.nombre ?? ""}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, nombre: e.target.value }))
              }
              required
            />
            <Input
              label="Apellido"
              value={profileForm.apellido ?? ""}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, apellido: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono"
              value={profileForm.telefono ?? ""}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  telefono: e.target.value || null,
                }))
              }
              placeholder="Ej: 11-1234-5678"
            />
            <Input
              label="DNI"
              value={profileForm.dni ?? ""}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  dni: e.target.value || null,
                }))
              }
              placeholder="Ej: 12345678"
            />
          </div>
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={profileForm.fecha_nacimiento ?? ""}
            onChange={(e) =>
              setProfileForm((f) => ({
                ...f,
                fecha_nacimiento: e.target.value || null,
              }))
            }
          />
        </form>
      </Modal>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-sm text-neutral-900">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = "default",
  badge,
}: {
  label: string;
  value: string;
  color?: "primary" | "accent" | "default";
  badge?: React.ReactNode;
}) {
  const colorClasses = {
    primary: "border-primary-200 bg-primary-50",
    accent: "border-accent-200 bg-accent-50",
    default: "border-neutral-200 bg-white",
  };

  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {badge}
      </div>
    </div>
  );
}

function EvalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}
