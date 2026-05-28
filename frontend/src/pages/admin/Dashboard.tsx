import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Spinner } from "../../components/ui";
import { stats } from "../../services/adminApi";
import type { DashboardStats } from "../../services/adminApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await stats.dashboard();
        setData(res.data);
      } catch {
        setError("No se pudieron cargar los datos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-6 text-center text-danger-400">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      label: "Alumnos activos",
      value: data?.total_alumnos ?? 0,
      icon: <AlumnosIcon />,
      color: "orange" as const,
      sub: "Primer Centro Fitness aprobado por el Min. de Salud",
    },
    {
      label: "Profesores",
      value: data?.total_profesores ?? 0,
      icon: <ProfesorIcon />,
      color: "blue" as const,
      sub: "Profesionales certificados",
    },
    {
      label: "Actividades",
      value: data?.total_actividades ?? 0,
      icon: <ActividadIcon />,
      color: "green" as const,
      sub: "Pilates, Cardio, Nutrición y más",
    },
    {
      label: "Turnos hoy",
      value: data?.turnos_hoy ?? 0,
      icon: <TurnoIcon />,
      color: "purple" as const,
      sub: "Clases programadas para hoy",
    },
    {
      label: "Inscripciones activas",
      value: data?.inscripciones_activas ?? 0,
      icon: <InscripcionIcon />,
      color: "teal" as const,
      sub: "Total de inscripciones vigentes",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 mb-1">
            Panel de administración
          </p>
          <h1 className="text-3xl font-black uppercase tracking-wide text-neutral-50">
            Hola, {user?.nombre}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            HSP-70 · San Martín 1085, Comodoro Rivadavia, Chubut
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2 rounded-xl border border-neutral-700/60 bg-neutral-800 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
          <span className="text-xs font-semibold text-neutral-300">Sistema activo</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attendance chart — takes 2/3 */}
        <div className="lg:col-span-2 rounded-xl border border-neutral-700/60 bg-neutral-800 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-neutral-50">
                Asistencia Semanal
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">Últimos 7 días · datos reales</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary-500" />
                Presentes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-neutral-600" />
                Ausentes
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data?.asistencia_semanal ?? []}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "13px",
                }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="presentes" name="Presentes" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="ausentes" name="Ausentes" fill="#374151" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick info — takes 1/3 */}
        <div className="rounded-xl border border-neutral-700/60 bg-neutral-800 p-6 flex flex-col gap-4">
          <h2 className="text-lg font-black uppercase tracking-wide text-neutral-50">
            HSP-70
          </h2>
          <div className="space-y-3 flex-1">
            <InfoRow icon={<PinIcon />} label="Dirección" value="San Martín 1085, Comodoro Rivadavia" />
            <InfoRow icon={<PhoneIcon />} label="Teléfono" value="+549 297 6257545" />
            <InfoRow icon={<StarIcon />} label="Certificación" value="Aprobado por Ministerio de Salud de Chubut" />
            <InfoRow icon={<ActivityLineIcon />} label="Actividades" value="Pilates · Integral · Pediátrico · Cardio · Nutrición · Active Recovery · Readaptación" />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-xl font-black uppercase tracking-wide text-neutral-50">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction label="Usuarios" description="Alta, baja y edición" onClick={() => navigate("/admin/usuarios")} icon={<UsersIcon />} />
          <QuickAction label="Actividades" description="Crear y configurar" onClick={() => navigate("/admin/actividades")} icon={<ActividadIcon />} />
          <QuickAction label="Turnos" description="Horarios y salas" onClick={() => navigate("/admin/turnos")} icon={<TurnoIcon />} />
          <QuickAction label="Planes" description="Membresías y precios" onClick={() => navigate("/admin/planes")} icon={<InscripcionIcon />} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const COLOR_MAP = {
  orange: { bg: "bg-primary-500/10 border-primary-500/20", val: "text-primary-400", icon: "text-primary-500" },
  blue:   { bg: "bg-accent-500/10 border-accent-500/20",   val: "text-accent-400",  icon: "text-accent-500" },
  green:  { bg: "bg-success-500/10 border-success-500/20", val: "text-success-400", icon: "text-success-500" },
  purple: { bg: "bg-purple-500/10 border-purple-500/20",   val: "text-purple-400",  icon: "text-purple-500" },
  teal:   { bg: "bg-teal-500/10 border-teal-500/20",       val: "text-teal-400",    icon: "text-teal-500" },
};

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: number | string; icon: React.ReactNode;
  color: keyof typeof COLOR_MAP; sub?: string;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg}`}>
      <div className={`mb-3 ${c.icon}`}>{icon}</div>
      <p className={`text-2xl font-black ${c.val}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-neutral-300">{label}</p>
      {sub && <p className="mt-1 text-[10px] text-neutral-500 leading-tight">{sub}</p>}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0 text-primary-500">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <p className="text-xs text-neutral-300 leading-snug">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ label, description, onClick, icon }: {
  label: string; description: string; onClick: () => void; icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-neutral-700/60 bg-neutral-800 p-4 text-left transition-all duration-200 hover:border-primary-500/50 hover:bg-neutral-700/50 cursor-pointer w-full"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400 transition-colors group-hover:bg-primary-500/25">
        {icon}
      </div>
      <div>
        <p className="font-bold text-neutral-100 text-sm">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
    </button>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function AlumnosIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>;
}

function ProfesorIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
  </svg>;
}

function ActividadIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>;
}

function TurnoIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>;
}

function InscripcionIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
  </svg>;
}

function UsersIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>;
}

function PinIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>;
}

function PhoneIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
  </svg>;
}

function StarIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
  </svg>;
}

function ActivityLineIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>;
}
