import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Badge,
  Spinner,
  EmptyState,
  Pagination,
} from "../../components/ui";
import {
  notificaciones,
  type Notificacion,
  type NotificacionList,
} from "../../services/adminApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return "hace unos segundos";
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "hace 1 minuto" : `hace ${diffMinutes} minutos`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? "hace 1 hora" : `hace ${diffHours} horas`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

type TipoBadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "accent";

function getTipoBadgeVariant(tipo: string): TipoBadgeVariant {
  const map: Record<string, TipoBadgeVariant> = {
    info: "accent",
    informacion: "accent",
    alerta: "warning",
    advertencia: "warning",
    error: "danger",
    sistema: "default",
    exito: "success",
    pago: "primary",
    recordatorio: "primary",
  };
  return map[tipo.toLowerCase()] ?? "default";
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function BellIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function CheckAllIcon() {
  return (
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
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

// ─── Filter type ─────────────────────────────────────────────────────────────

type FilterMode = "all" | "unread";

const PAGE_SIZE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

export default function Notificaciones() {
  const [data, setData] = useState<NotificacionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [page, setPage] = useState(1);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { solo_no_leidas?: boolean; page: number; page_size: number } = {
        page,
        page_size: PAGE_SIZE,
      };
      if (filter === "unread") {
        params.solo_no_leidas = true;
      }
      const response = await notificaciones.list(params);
      setData(response.data);
    } catch {
      setError("Error al cargar las notificaciones. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  function handleFilterChange(newFilter: FilterMode) {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setPage(1);
    }
  }

  async function handleMarkAsRead(id: number) {
    setMarkingReadId(id);
    try {
      await notificaciones.markAsRead(id);
      await fetchNotificaciones();
    } catch {
      setError("Error al marcar la notificacion como leida.");
    } finally {
      setMarkingReadId(null);
    }
  }

  async function handleMarkAllAsRead() {
    setMarkingAllRead(true);
    try {
      await notificaciones.markAllAsRead();
      await fetchNotificaciones();
    } catch {
      setError("Error al marcar todas las notificaciones como leidas.");
    } finally {
      setMarkingAllRead(false);
    }
  }

  const unreadCount = data?.total_no_leidas ?? 0;
  const items = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Centro de Notificaciones
          </h1>
          {unreadCount > 0 && (
            <Badge variant="danger">
              {unreadCount} {unreadCount === 1 ? "nueva" : "nuevas"}
            </Badge>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={<CheckAllIcon />}
            loading={markingAllRead}
            onClick={handleMarkAllAsRead}
          >
            Marcar todas como leidas
          </Button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-1">
        <Button
          variant={filter === "all" ? "primary" : "secondary"}
          size="sm"
          onClick={() => handleFilterChange("all")}
        >
          Todas
        </Button>
        <Button
          variant={filter === "unread" ? "primary" : "secondary"}
          size="sm"
          onClick={() => handleFilterChange("unread")}
        >
          No leidas
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-semibold">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Cargando notificaciones..." />
        </div>
      )}

      {/* Content */}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<BellIcon />}
          title={
            filter === "unread"
              ? "No tienes notificaciones sin leer"
              : "No tienes notificaciones"
          }
          description={
            filter === "unread"
              ? "Todas tus notificaciones han sido leidas."
              : "Cuando recibas notificaciones, apareceran aqui."
          }
        />
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((notif) => (
            <NotificationItem
              key={notif.id}
              notificacion={notif}
              markingRead={markingReadId === notif.id}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pt-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

// ─── Notification Item ───────────────────────────────────────────────────────

interface NotificationItemProps {
  notificacion: Notificacion;
  markingRead: boolean;
  onMarkAsRead: (id: number) => void;
}

function NotificationItem({
  notificacion,
  markingRead,
  onMarkAsRead,
}: NotificationItemProps) {
  const { id, tipo, mensaje, leida, fecha } = notificacion;

  return (
    <div
      className={`
        group relative flex items-start gap-4 rounded-xl border px-5 py-4
        transition-colors duration-150
        ${
          leida
            ? "border-neutral-100 bg-white"
            : "border-l-[3px] border-primary-300 border-t-neutral-100 border-r-neutral-100 border-b-neutral-100 bg-primary-50/40"
        }
      `}
    >
      {/* Unread dot */}
      {!leida && (
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getTipoBadgeVariant(tipo)}>{tipo}</Badge>
          <span className="text-xs text-neutral-400">
            {formatRelativeDate(fecha)}
          </span>
        </div>
        <p
          className={`mt-1.5 text-sm leading-relaxed ${
            leida ? "text-neutral-500" : "text-neutral-800"
          }`}
        >
          {mensaje}
        </p>
      </div>

      {/* Mark as read */}
      {!leida && (
        <div className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={<CheckIcon />}
            loading={markingRead}
            onClick={() => onMarkAsRead(id)}
          >
            Marcar como leida
          </Button>
        </div>
      )}
    </div>
  );
}
