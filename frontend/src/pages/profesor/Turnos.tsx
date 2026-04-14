import { useState, useEffect, useMemo } from "react";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, EmptyState, Badge, Table } from "../../components/ui";
import type { Column } from "../../components/ui";
import { misTurnos, actividadesRef } from "../../services/profesorApi";
import type { TurnoDetail } from "../../services/profesorApi";
import type { Actividad } from "../../services/adminApi";

const DIAS_SEMANA: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const DIAS_ORDER: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default function ProfesorTurnos() {
  const { user } = useAuth();
  const [turnos, setTurnos] = useState<TurnoDetail[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actividadMap = useMemo(() => {
    const map = new Map<number, Actividad>();
    actividades.forEach((a) => map.set(a.id, a));
    return map;
  }, [actividades]);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [turnosRes, actRes] = await Promise.all([
          misTurnos.list(user!.id),
          actividadesRef.list(),
        ]);

        setActividades(actRes.data.items);

        const details = await Promise.all(
          turnosRes.data.items.map((t) => misTurnos.getDetail(t.id)),
        );
        setTurnos(details.map((d) => d.data));
      } catch {
        setError("No se pudieron cargar los turnos.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const sortedTurnos = useMemo(
    () =>
      [...turnos].sort((a, b) => {
        const dayDiff = (DIAS_ORDER[a.dia_semana] ?? 0) - (DIAS_ORDER[b.dia_semana] ?? 0);
        if (dayDiff !== 0) return dayDiff;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      }),
    [turnos],
  );

  const columns: Column<TurnoDetail>[] = [
    {
      key: "actividad",
      header: "Actividad",
      render: (row) => (
        <span className="font-medium text-neutral-900">
          {actividadMap.get(row.actividad_id)?.nombre ?? `#${row.actividad_id}`}
        </span>
      ),
    },
    {
      key: "dia_semana",
      header: "Día",
      sortable: true,
      render: (row) => DIAS_SEMANA[row.dia_semana] ?? row.dia_semana,
    },
    {
      key: "horario",
      header: "Horario",
      render: (row) => (
        <span>
          {formatTime(row.hora_inicio)} – {formatTime(row.hora_fin)}
        </span>
      ),
    },
    {
      key: "sala",
      header: "Sala",
      render: (row) => row.sala ?? <span className="text-neutral-400">—</span>,
    },
    {
      key: "inscritos",
      header: "Inscritos / Cupo",
      render: (row) => {
        const pct = row.cupo_maximo > 0 ? row.inscritos / row.cupo_maximo : 0;
        let variant: "success" | "warning" | "danger" | "default" = "success";
        if (pct >= 1) variant = "danger";
        else if (pct >= 0.8) variant = "warning";
        else if (pct === 0) variant = "default";

        return (
          <Badge variant={variant}>
            {row.inscritos} / {row.cupo_maximo}
          </Badge>
        );
      },
    },
  ];

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
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Turnos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Todos los turnos asignados a tu agenda semanal
        </p>
      </div>

      {sortedTurnos.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin turnos asignados"
            description="No tenés turnos asignados en este momento. Contactá al administrador si creés que es un error."
          />
        </Card>
      ) : (
        <Card padding="none">
          <Table columns={columns} data={sortedTurnos} keyExtractor={(row) => row.id} />
        </Card>
      )}
    </div>
  );
}
