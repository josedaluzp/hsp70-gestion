import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface User {
  id: number;
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

export interface UserUpdate {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string | null;
  dni?: string | null;
  fecha_nacimiento?: string | null;
  rol?: string;
  activo?: boolean;
}

export interface Actividad {
  id: number;
  nombre: string;
  descripcion: string | null;
  cupo_maximo: number;
  duracion_min: number;
  activa: boolean;
}

export interface ActividadForm {
  nombre: string;
  descripcion?: string;
  cupo_maximo: number;
  duracion_min: number;
  activa?: boolean;
}

export interface Turno {
  id: number;
  actividad_id: number;
  profesor_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  sala: string | null;
  activo: boolean;
}

export interface TurnoForm {
  actividad_id: number;
  profesor_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  sala?: string;
  activo?: boolean;
}

export interface Profesor {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Plan {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_dias: number;
  max_actividades: number;
}

export interface PlanForm {
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion_dias: number;
  max_actividades: number;
}

export interface Notificacion {
  id: number;
  usuario_id: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
}

export interface NotificacionList extends PaginatedResponse<Notificacion> {
  total_no_leidas: number;
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export const usuarios = {
  list: (params?: {
    rol?: string;
    activo?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }) => api.get<PaginatedResponse<User>>("/usuarios", { params }),

  get: (id: number) => api.get<User>(`/usuarios/${id}`),

  update: (id: number, data: UserUpdate) =>
    api.put<User>(`/usuarios/${id}`, data),

  toggleActivo: (id: number) =>
    api.put<User>(`/usuarios/${id}/toggle-activo`),
};

// ─── Actividades ──────────────────────────────────────────────────────────────

export const actividades = {
  list: (params?: { nombre?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Actividad>>("/actividades", { params }),

  get: (id: number) => api.get<Actividad>(`/actividades/${id}`),

  create: (data: ActividadForm) =>
    api.post<Actividad>("/actividades", data),

  update: (id: number, data: Partial<ActividadForm>) =>
    api.put<Actividad>(`/actividades/${id}`, data),

  delete: (id: number) => api.delete(`/actividades/${id}`),
};

// ─── Turnos ───────────────────────────────────────────────────────────────────

export const turnos = {
  list: (params?: {
    actividad_id?: number;
    profesor_id?: number;
    dia_semana?: string;
    page?: number;
    page_size?: number;
  }) => api.get<PaginatedResponse<Turno>>("/turnos", { params }),

  get: (id: number) => api.get<Turno>(`/turnos/${id}`),

  create: (data: TurnoForm) => api.post<Turno>("/turnos", data),

  update: (id: number, data: Partial<TurnoForm>) =>
    api.put<Turno>(`/turnos/${id}`, data),

  delete: (id: number) => api.delete(`/turnos/${id}`),
};

// ─── Profesores ───────────────────────────────────────────────────────────────

export const profesores = {
  list: () => api.get<Profesor[]>("/usuarios/profesores"),
};

// ─── Planes ───────────────────────────────────────────────────────────────────

export const planes = {
  list: (params?: { nombre?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Plan>>("/planes", { params }),

  get: (id: number) => api.get<Plan>(`/planes/${id}`),

  create: (data: PlanForm) => api.post<Plan>("/planes", data),

  update: (id: number, data: Partial<PlanForm>) =>
    api.put<Plan>(`/planes/${id}`, data),

  delete: (id: number) => api.delete(`/planes/${id}`),
};

// ─── Notificaciones ───────────────────────────────────────────────────────────

export const notificaciones = {
  list: (params?: {
    solo_no_leidas?: boolean;
    page?: number;
    page_size?: number;
  }) => api.get<NotificacionList>("/notificaciones", { params }),

  markAsRead: (id: number) =>
    api.put<Notificacion>(`/notificaciones/${id}/leer`),

  markAllAsRead: () =>
    api.put<{ marked: number }>("/notificaciones/leer-todas"),
};
