export const ACTIVIDADES = [
  { num: "01", nombre: "Pilates Reformer", desc: "Máquina Reformer · Flexibilidad, postura y fuerza del core", duracion: "50 min", cupo: 8 },
  { num: "02", nombre: "Entrenamiento Integral", desc: "Fuerza, resistencia y movilidad funcional", duracion: "60 min", cupo: 12 },
  { num: "03", nombre: "Fitness Pediátrico", desc: "Programa para niños y adolescentes", duracion: "45 min", cupo: 10 },
  { num: "04", nombre: "Entren. Cardiovascular", desc: "Alta intensidad · capacidad cardiovascular", duracion: "45 min", cupo: 15 },
  { num: "05", nombre: "Active Recovery", desc: "Recuperación activa post-entrenamiento", duracion: "50 min", cupo: 12 },
  { num: "06", nombre: "Readaptación Deportiva", desc: "Recuperación post-lesión · cupo reducido", duracion: "60 min", cupo: 6 },
  { num: "07", nombre: "Nutrición Deportiva", desc: "Consulta individual · plan personalizado", duracion: "40 min", cupo: 1 },
];

export const EQUIPO = [
  { nombre: "Yanina Figuerao", rol: "Directora", foto: "/images/equipo/yanina-figuerao.jpg" },
  { nombre: "Ángel Da Luz Pereira", rol: "Director", foto: "/images/equipo/angel-daluz.jpg" },
  { nombre: "Facundo Nieva", rol: "Prof. Ed. Física", foto: "/images/equipo/facundo-nieva.jpg" },
  { nombre: "Bruno Rubio", rol: "Prof. Ed. Física", foto: "/images/equipo/bruno-rubio.jpg" },
  { nombre: "Maximiliano Tögel", rol: "Lic. Ed. Física", foto: "/images/equipo/maximiliano-togel.jpg" },
  { nombre: "Manuel Pazos Espín", rol: "Médico Deportólogo", foto: "/images/equipo/manuel-pazos.jpg" },
  { nombre: "Walter Ríos", rol: "Lic. Kinesiología", foto: "/images/equipo/walter-rios.jpg" },
  { nombre: "Gabriel Velázquez", rol: "Ortopedista", foto: "/images/equipo/gabriel-velazquez.jpg" },
];

export const PLANES = [
  { nombre: "Básico", creditos: 10, badge: null, features: ["1 crédito = 1 clase", "Sin vencimiento", "Todas las actividades"] },
  { nombre: "Pro", creditos: 25, badge: "MÁS ELEGIDO", features: ["1 crédito = 1 clase", "Sin vencimiento", "Todas las actividades"] },
  { nombre: "Elite", creditos: 50, badge: null, features: ["1 crédito = 1 clase", "Sin vencimiento", "Todas las actividades"] },
];

export const STATS = [
  { valor: "7", label: "Actividades" },
  { valor: "8", label: "Profesionales" },
  { valor: "N°1", label: "En Chubut" },
];

export const PASOS = [
  { n: "1", titulo: "Elegí tu actividad", desc: "Pilates, Cardio, Nutrición, Readaptación y más. Cada una con su propio cupo y duración." },
  { n: "2", titulo: "Comprá un pack de créditos", desc: "Usalos como y cuando quieras. Sin vencimientos forzados ni compromisos mensuales." },
  { n: "3", titulo: "Reservá tu clase online", desc: "Confirmación instantánea. Cancelá hasta 2 horas antes sin perder el crédito." },
];
