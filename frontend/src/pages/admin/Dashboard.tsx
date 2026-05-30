import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Spinner } from "../../components/ui";
import { stats } from "../../services/adminApi";
import type {
  DashboardStats,
  UsuarioMini,
  HorarioCelda,
  RetencionMes,
} from "../../services/adminApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DIAS_LABEL: Record<string, string> = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue",
  viernes: "Vie", sabado: "Sáb", domingo: "Dom",
};
const HORAS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 a 22:00

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardStats | null>(null);
  const [horarios, setHorarios] = useState<HorarioCelda[]>([]);
  const [retencion, setRetencion] = useState<RetencionMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [d, h, r] = await Promise.all([
          stats.dashboard(),
          stats.horariosPico(),
          stats.retencion(),
        ]);
        setData(d.data);
        setHorarios(h.data.celdas);
        setRetencion(r.data.meses);
      } catch {
        setError("No se pudieron cargar los datos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function verUsuario(u: UsuarioMini) {
    navigate(`/admin/usuarios?search=${encodeURIComponent(u.email)}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-600">
        {error ?? "Sin datos"}
      </div>
    );
  }

  const baseCards = [
    { label: "Alumnos activos", value: data.total_alumnos },
    { label: "Profesores", value: data.total_profesores },
    { label: "Actividades", value: data.total_actividades },
    { label: "Turnos hoy", value: data.turnos_hoy },
    { label: "Inscripciones activas", value: data.inscripciones_activas },
  ];

  const statusCards = [
    { key: "altas", label: "Altas (30 días)", value: data.altas_30d, lista: data.altas_lista, tone: "success" as const },
    { key: "bajas", label: "Bajas", value: data.bajas, lista: data.bajas_lista, tone: "danger" as const },
    { key: "pausa", label: "En pausa", value: data.en_pausa, lista: data.en_pausa_lista, tone: "warning" as const },
    { key: "morosos", label: "Sin créditos", value: data.morosos, lista: data.morosos_lista, tone: "neutral" as const },
  ];

  const maxHeat = Math.max(1, ...horarios.map((c) => c.total));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-1">
          Panel de administración
        </p>
        <h1 className="text-3xl font-black uppercase tracking-wide text-neutral-900">
          Hola, {user?.nombre}
        </h1>
      </div>

      {/* Base cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {baseCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-black text-neutral-900">{c.value}</p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Status cards with expandable lists */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map(({ key, ...c }) => (
          <StatusCard key={key} {...c} onVerUsuario={verUsuario} />
        ))}
      </div>

      {/* Weekly attendance */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-black uppercase tracking-wide text-neutral-900">
          Asistencia semanal
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.asistencia_semanal} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="fecha" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="presentes" name="Presentes" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="ausentes" name="Ausentes" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Peak hours heatmap */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 overflow-x-auto">
        <h2 className="mb-4 text-lg font-black uppercase tracking-wide text-neutral-900">
          Horarios pico
        </h2>
        <div className="min-w-[640px]">
          <div className="grid" style={{ gridTemplateColumns: `48px repeat(${HORAS.length}, 1fr)` }}>
            <div />
            {HORAS.map((h) => (
              <div key={h} className="text-center text-[10px] text-neutral-400 pb-1">{h}</div>
            ))}
            {DIAS.map((dia) => (
              <HeatRow key={dia} dia={dia} horarios={horarios} maxHeat={maxHeat} />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">Asistencias registradas por día y hora de inicio del turno.</p>
        </div>
      </div>

      {/* Retention */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-black uppercase tracking-wide text-neutral-900">
          Evolución mensual
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={retencion} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="altas" name="Altas" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="bajas" name="Bajas" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="asistentes_unicos" name="Asistentes" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  success: "text-success-600",
  danger: "text-danger-600",
  warning: "text-warning-600",
  neutral: "text-neutral-700",
};

function StatusCard({
  label, value, lista, tone, onVerUsuario,
}: {
  label: string; value: number; lista: UsuarioMini[];
  tone: "success" | "danger" | "warning" | "neutral";
  onVerUsuario: (u: UsuarioMini) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left cursor-pointer"
      >
        <div>
          <p className={`text-2xl font-black ${TONE[tone]}`}>{value}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">{label}</p>
        </div>
        <span className="text-xs text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
          {lista.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin registros.</p>
          ) : (
            lista.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onVerUsuario(u)}
                className="block w-full truncate text-left text-xs text-neutral-600 hover:text-primary-600 cursor-pointer"
              >
                {u.nombre} {u.apellido}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HeatRow({ dia, horarios, maxHeat }: { dia: string; horarios: HorarioCelda[]; maxHeat: number }) {
  return (
    <>
      <div className="flex items-center text-[11px] text-neutral-500 pr-2">{DIAS_LABEL[dia]}</div>
      {HORAS.map((h) => {
        const cell = horarios.find((c) => c.dia === dia && c.hora === h);
        const total = cell?.total ?? 0;
        const intensity = total === 0 ? 0 : 0.15 + 0.85 * (total / maxHeat);
        return (
          <div key={h} className="aspect-square m-[1px] rounded-sm" title={`${DIAS_LABEL[dia]} ${h}:00 — ${total}`}
            style={{ backgroundColor: total === 0 ? "#f1f5f9" : `rgba(249,115,22,${intensity})` }} />
        );
      })}
    </>
  );
}
