import api from "./api";
import type { PaginatedResponse } from "./adminApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Ejercicio {
  id: number;
  nombre: string;
  video_url: string;
  created_at: string;
}

export interface EjercicioForm {
  nombre: string;
  video_url: string;
}

export interface RutinaEjercicioItem {
  ejercicio_id: number;
  orden: number;
}

export interface RutinaEjercicio {
  id: number;
  orden: number;
  ejercicio: Ejercicio;
}

export interface Rutina {
  id: number;
  nombre: string;
  descripcion: string | null;
  profesor_id: number;
  profesor_nombre: string | null;
  created_at: string;
  ejercicio_count: number;
}

export interface RutinaDetail {
  id: number;
  nombre: string;
  descripcion: string | null;
  profesor_id: number;
  profesor_nombre: string | null;
  created_at: string;
  ejercicios: RutinaEjercicio[];
}

export interface RutinaForm {
  nombre: string;
  descripcion?: string;
  ejercicios?: RutinaEjercicioItem[];
}

export interface Asignacion {
  id: number;
  rutina_id: number;
  alumno_id: string;
  fecha_asignacion: string;
  alumno_nombre: string | null;
}

export interface AlumnoRutina {
  id: number;
  nombre: string;
  descripcion: string | null;
  profesor_nombre: string | null;
  ejercicio_count: number;
  fecha_asignacion: string;
}

// ─── Ejercicios ──────────────────────────────────────────────────────────────

export const ejerciciosApi = {
  list: (params?: { nombre?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Ejercicio>>("/ejercicios", { params }),

  get: (id: number) => api.get<Ejercicio>(`/ejercicios/${id}`),

  create: (data: EjercicioForm) => api.post<Ejercicio>("/ejercicios", data),

  update: (id: number, data: Partial<EjercicioForm>) =>
    api.put<Ejercicio>(`/ejercicios/${id}`, data),

  delete: (id: number) => api.delete(`/ejercicios/${id}`),
};

// ─── Rutinas ─────────────────────────────────────────────────────────────────

export const rutinasApi = {
  list: (params?: {
    nombre?: string;
    profesor_id?: number;
    page?: number;
    page_size?: number;
  }) => api.get<PaginatedResponse<Rutina>>("/rutinas", { params }),

  get: (id: number) => api.get<RutinaDetail>(`/rutinas/${id}`),

  create: (data: RutinaForm) => api.post<RutinaDetail>("/rutinas", data),

  update: (id: number, data: Partial<RutinaForm>) =>
    api.put<RutinaDetail>(`/rutinas/${id}`, data),

  delete: (id: number) => api.delete(`/rutinas/${id}`),

  asignar: (rutinaId: number, alumnoId: string) =>
    api.post<Asignacion>(`/rutinas/${rutinaId}/asignar`, {
      alumno_id: alumnoId,
    }),

  desasignar: (rutinaId: number, alumnoId: string) =>
    api.delete(`/rutinas/${rutinaId}/asignar/${alumnoId}`),

  listAsignaciones: (rutinaId: number) =>
    api.get<Asignacion[]>(`/rutinas/${rutinaId}/asignaciones`),
};

// ─── Rutinas (Alumno) ────────────────────────────────────────────────────────

export const rutinasAlumnoApi = {
  list: (alumnoId: string) =>
    api.get<AlumnoRutina[]>(`/alumnos/${alumnoId}/rutinas`),

  get: (alumnoId: string, rutinaId: number) =>
    api.get<RutinaDetail>(`/alumnos/${alumnoId}/rutinas/${rutinaId}`),
};
