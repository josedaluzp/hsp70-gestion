export type RolUsuario = 'admin' | 'profesor' | 'recepcionista' | 'alumno'
export type EstadoInscripcion = 'activa' | 'cancelada' | 'lista_espera'
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
export type TipoTransaccion = 'compra' | 'consumo' | 'devolucion' | 'ajuste_manual'

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  dni: string | null
  fecha_nacimiento: string | null
  rol: RolUsuario
  activo: boolean
  creditos: number
  created_at: string
}

export interface Actividad {
  id: number
  nombre: string
  descripcion: string | null
  cupo_maximo: number
  duracion_min: number
  activa: boolean
}

export interface Turno {
  id: number
  actividad_id: number
  profesor_id: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
  sala: string | null
  activo: boolean
}

export interface Inscripcion {
  id: number
  alumno_id: string
  turno_id: number
  estado: EstadoInscripcion
  fecha_inscripcion: string
}

export interface Asistencia {
  id: number
  inscripcion_id: number
  fecha: string
  presente: boolean
  observacion: string | null
}

export interface Plan {
  id: number
  nombre: string
  creditos: number
  precio: number
  descripcion: string | null
}

export interface TransaccionCredito {
  id: number
  usuario_id: string
  tipo: TipoTransaccion
  cantidad: number
  descripcion: string | null
  created_at: string
}

export interface Rutina {
  id: number
  nombre: string
  descripcion: string | null
  profesor_id: string
  created_at: string
}

export interface Ejercicio {
  id: number
  nombre: string
  descripcion: string | null
  grupo_muscular: string | null
  video_url: string | null
}

export interface EjercicioRutina {
  id: number
  rutina_id: number
  ejercicio_id: number
  series: number | null
  repeticiones: number | null
  duracion_seg: number | null
  descanso_seg: number | null
  orden: number
  notas: string | null
}

export interface Evaluacion {
  id: number
  alumno_id: string
  profesor_id: string
  fecha: string
  peso_kg: number | null
  altura_cm: number | null
  imc: number | null
  grasa_corporal_pct: number | null
  notas: string | null
}

export interface Notificacion {
  id: number
  usuario_id: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
}

export interface AuthenticatedUser {
  id: string
  rol: RolUsuario
  activo: boolean
}
