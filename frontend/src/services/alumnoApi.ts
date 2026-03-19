import api from "./api";
import type { PaginatedResponse, Actividad, Turno, Plan, Notificacion, NotificacionList } from "./adminApi";
import type { TurnoDetail, EvaluacionSalud } from "./profesorApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MiInscripcion {
  id: number;
  alumno_id: number;
  turno_id: number;
  estado: string;
  fecha_inscripcion: string;
  nombre_actividad: string | null;
  dia_semana: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  sala: string | null;
  nombre_profesor: string | null;
  posicion_espera: number | null;
}

export interface MiInscripcionList {
  items: MiInscripcion[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Pago {
  id: number;
  alumno_id: number;
  plan_id: number;
  monto: number;
  fecha_pago: string;
  fecha_vencimiento: string;
  estado: string;
  metodo_pago: string | null;
  mp_payment_id: string | null;
  nombre_plan: string | null;
}

export interface PagoList {
  items: Pago[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface MiAsistencia {
  id: number;
  inscripcion_id: number;
  fecha: string;
  presente: boolean;
  observacion: string | null;
  nombre_actividad: string | null;
}

export interface MiAsistenciaList {
  items: MiAsistencia[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PerfilUpdate {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  dni?: string | null;
  fecha_nacimiento?: string | null;
}

// ─── Actividades (lectura) ──────────────────────────────────────────────────

export const actividadesAlumno = {
  list: (params?: { nombre?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Actividad>>("/actividades", {
      params: { ...params, page_size: params?.page_size ?? 100 },
    }),

  get: (id: number) =>
    api.get<Actividad>(`/actividades/${id}`),
};

// ─── Turnos ─────────────────────────────────────────────────────────────────

export const turnosAlumno = {
  list: (params?: { actividad_id?: number; dia_semana?: string; page_size?: number }) =>
    api.get<PaginatedResponse<Turno>>("/turnos", {
      params: { ...params, page_size: params?.page_size ?? 100 },
    }),

  getDetail: (turnoId: number) =>
    api.get<TurnoDetail>(`/turnos/${turnoId}`),
};

// ─── Inscripciones ──────────────────────────────────────────────────────────

export const inscripciones = {
  list: (alumnoId: number, params?: { solo_activas?: boolean; page?: number; page_size?: number }) =>
    api.get<MiInscripcionList>(`/alumnos/${alumnoId}/inscripciones`, { params }),

  crear: (turnoId: number) =>
    api.post("/inscripciones", { turno_id: turnoId }),

  cancelar: (inscripcionId: number) =>
    api.delete(`/inscripciones/${inscripcionId}`),
};

// ─── Asistencias (propias) ──────────────────────────────────────────────────

export const misAsistencias = {
  list: (alumnoId: number, params?: { fecha_desde?: string; fecha_hasta?: string; page?: number; page_size?: number }) =>
    api.get<MiAsistenciaList>(`/alumnos/${alumnoId}/asistencias`, { params }),
};

// ─── Evaluaciones (propias) ─────────────────────────────────────────────────

export const misEvaluaciones = {
  list: (alumnoId: number) =>
    api.get<EvaluacionSalud[]>(`/alumnos/${alumnoId}/evaluaciones`),
};

// ─── Planes ─────────────────────────────────────────────────────────────────

export const planesAlumno = {
  list: () =>
    api.get<PaginatedResponse<Plan>>("/planes", { params: { page_size: 50 } }),
};

// ─── Notificaciones ─────────────────────────────────────────────────────────

export const notificacionesAlumno = {
  list: (params?: { solo_no_leidas?: boolean; page?: number; page_size?: number }) =>
    api.get<NotificacionList>("/notificaciones", { params }),

  markAsRead: (id: number) =>
    api.put<Notificacion>(`/notificaciones/${id}/leer`),
};

// ─── Perfil ─────────────────────────────────────────────────────────────────

export const perfil = {
  update: (userId: number, data: PerfilUpdate) =>
    api.put(`/usuarios/${userId}`, data),
};
