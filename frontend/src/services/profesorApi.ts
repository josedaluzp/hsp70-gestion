import api from "./api";
import type { PaginatedResponse, Actividad, Turno } from "./adminApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TurnoDetail extends Turno {
  inscritos: number;
  cupo_maximo: number;
  cupo_disponible: number;
}

export interface InscripcionDetail {
  id: number;
  alumno_id: string;
  turno_id: number;
  estado: string;
  fecha_inscripcion: string;
  nombre_alumno: string | null;
  nombre_actividad: string | null;
  dia_semana: string | null;
  hora_inicio: string | null;
  posicion_espera: number | null;
}

export interface InscripcionList {
  items: InscripcionDetail[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AsistenciaDetail {
  id: number;
  inscripcion_id: number;
  fecha: string;
  presente: boolean;
  observacion: string | null;
  alumno_id: string | null;
  nombre_alumno: string | null;
}

export interface AsistenciaList {
  items: AsistenciaDetail[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AsistenciaCreate {
  inscripcion_id: number;
  fecha: string;
  presente: boolean;
  observacion?: string | null;
}

export interface AsistenciaUpdate {
  presente?: boolean;
  observacion?: string | null;
}

export interface EvaluacionSalud {
  id: number;
  alumno_id: string;
  profesional_id: number;
  fecha: string;
  peso_kg: number | null;
  altura_cm: number | null;
  imc: number | null;
  grasa_corporal: number | null;
  objetivo: string | null;
  notas: string | null;
}

export interface EvaluacionCreate {
  alumno_id: string;
  peso_kg: number;
  altura_cm: number;
  grasa_corporal?: number | null;
  objetivo?: string | null;
  notas?: string | null;
}

export interface AlumnoBusqueda {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  rol: string;
  activo: boolean;
  created_at: string;
}

// ─── Turnos del profesor ─────────────────────────────────────────────────────

export const misTurnos = {
  list: (profesorId: string, params?: { page_size?: number }) =>
    api.get<PaginatedResponse<Turno>>("/turnos", {
      params: { profesor_id: profesorId, page_size: params?.page_size ?? 100 },
    }),

  getDetail: (turnoId: number) =>
    api.get<TurnoDetail>(`/turnos/${turnoId}`),
};

// ─── Actividades (lectura) ───────────────────────────────────────────────────

export const actividadesRef = {
  list: () =>
    api.get<PaginatedResponse<Actividad>>("/actividades", {
      params: { page_size: 100 },
    }),
};

// ─── Inscritos en un turno ───────────────────────────────────────────────────

export const inscritos = {
  list: (turnoId: number, params?: { page?: number; page_size?: number }) =>
    api.get<InscripcionList>(`/turnos/${turnoId}/inscritos`, { params }),
};

// ─── Asistencias ─────────────────────────────────────────────────────────────

export const asistencias = {
  listByTurno: (turnoId: number, fecha: string) =>
    api.get<AsistenciaList>(`/turnos/${turnoId}/asistencias`, {
      params: { fecha, page_size: 100 },
    }),

  registrar: (data: AsistenciaCreate) =>
    api.post("/asistencias", data),

  actualizar: (id: number, data: AsistenciaUpdate) =>
    api.put(`/asistencias/${id}`, data),
};

// ─── Evaluaciones ────────────────────────────────────────────────────────────

export const evaluaciones = {
  listByAlumno: (alumnoId: string) =>
    api.get<EvaluacionSalud[]>(`/alumnos/${alumnoId}/evaluaciones`),

  create: (data: EvaluacionCreate) =>
    api.post<EvaluacionSalud>("/evaluaciones", data),
};

// ─── Alumnos (búsqueda) ──────────────────────────────────────────────────────

export const alumnos = {
  search: (search: string) =>
    api.get<PaginatedResponse<AlumnoBusqueda>>("/usuarios", {
      params: { rol: "alumno", search, page_size: 20 },
    }),
};
