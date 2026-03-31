"""Seed the database with realistic test data for development and demo.

Usage: python -m app.seed
"""

import asyncio
import random
import unicodedata
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select

import app.core.database as _db
from app.core.security import hash_password
from app.models import (
    Actividad,
    Asistencia,
    DiaSemana,
    EstadoInscripcion,
    EstadoPago,
    EvaluacionSalud,
    Inscripcion,
    ListaEspera,
    MetodoPago,
    Notificacion,
    Pago,
    Plan,
    RolUsuario,
    Turno,
    Usuario,
)

TODAY = date(2026, 3, 18)
NOW = datetime(2026, 3, 18, 10, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Data definitions
# ---------------------------------------------------------------------------

ADMIN_DATA = {
    "nombre": "Administrador",
    "apellido": "HSP70",
    "email": "admin@hsp70.com",
    "password": "admin123",
    "telefono": "+54 11 5555-0001",
    "dni": "20300001",
    "fecha_nacimiento": date(1985, 6, 15),
    "rol": RolUsuario.ADMIN,
}

PROFESORES_DATA = [
    {
        "nombre": "Martín",
        "apellido": "Rodríguez",
        "email": "martin.rodriguez@hsp70.com",
        "password": "profesor123",
        "telefono": "+54 11 5555-1001",
        "dni": "28456001",
        "fecha_nacimiento": date(1982, 3, 22),
    },
    {
        "nombre": "Carolina",
        "apellido": "Fernández",
        "email": "carolina.fernandez@hsp70.com",
        "password": "profesor123",
        "telefono": "+54 11 5555-1002",
        "dni": "30789002",
        "fecha_nacimiento": date(1986, 11, 8),
    },
    {
        "nombre": "Alejandro",
        "apellido": "García",
        "email": "alejandro.garcia@hsp70.com",
        "password": "profesor123",
        "telefono": "+54 11 5555-1003",
        "dni": "27123003",
        "fecha_nacimiento": date(1980, 7, 30),
    },
]

RECEPCIONISTAS_DATA = [
    {
        "nombre": "Laura",
        "apellido": "Martínez",
        "email": "laura.martinez@hsp70.com",
        "password": "recep123",
        "telefono": "+54 11 5555-2001",
        "dni": "33456001",
        "fecha_nacimiento": date(1992, 1, 14),
    },
    {
        "nombre": "Diego",
        "apellido": "López",
        "email": "diego.lopez@hsp70.com",
        "password": "recep123",
        "telefono": "+54 11 5555-2002",
        "dni": "34789002",
        "fecha_nacimiento": date(1994, 9, 25),
    },
]

ALUMNOS_DATA = [
    {"nombre": "Sofía", "apellido": "Pérez", "dni": "35100001",
     "fecha_nacimiento": date(1995, 2, 10), "telefono": "+54 11 5555-3001"},
    {"nombre": "Luciano", "apellido": "Torres", "dni": "36200002",
     "fecha_nacimiento": date(1997, 5, 18), "telefono": "+54 11 5555-3002"},
    {"nombre": "Valentina", "apellido": "Gómez", "dni": "34300003",
     "fecha_nacimiento": date(1993, 8, 3), "telefono": "+54 11 5555-3003"},
    {"nombre": "Matías", "apellido": "Sánchez", "dni": "37400004",
     "fecha_nacimiento": date(1998, 12, 21), "telefono": "+54 11 5555-3004"},
    {"nombre": "Camila", "apellido": "Ramírez", "dni": "33500005",
     "fecha_nacimiento": date(1991, 4, 7), "telefono": "+54 11 5555-3005"},
    {"nombre": "Nicolás", "apellido": "Díaz", "dni": "38600006",
     "fecha_nacimiento": date(2000, 10, 30), "telefono": "+54 11 5555-3006"},
    {"nombre": "Florencia", "apellido": "Moreno", "dni": "35700007",
     "fecha_nacimiento": date(1996, 6, 14), "telefono": "+54 11 5555-3007"},
    {"nombre": "Santiago", "apellido": "Álvarez", "dni": "36800008",
     "fecha_nacimiento": date(1997, 1, 28), "telefono": "+54 11 5555-3008"},
    {"nombre": "Julieta", "apellido": "Romero", "dni": "34900009",
     "fecha_nacimiento": date(1994, 3, 19), "telefono": "+54 11 5555-3009"},
    {"nombre": "Tomás", "apellido": "Acosta", "dni": "37000010",
     "fecha_nacimiento": date(1999, 7, 5), "telefono": "+54 11 5555-3010"},
    {"nombre": "Martina", "apellido": "Herrera", "dni": "33100011",
     "fecha_nacimiento": date(1990, 11, 22), "telefono": "+54 11 5555-3011"},
    {"nombre": "Facundo", "apellido": "Medina", "dni": "38200012",
     "fecha_nacimiento": date(2001, 9, 8), "telefono": "+54 11 5555-3012"},
    {"nombre": "Agustina", "apellido": "Castro", "dni": "35300013",
     "fecha_nacimiento": date(1996, 2, 17), "telefono": "+54 11 5555-3013"},
    {"nombre": "Joaquín", "apellido": "Varela", "dni": "36400014",
     "fecha_nacimiento": date(1998, 5, 11), "telefono": "+54 11 5555-3014"},
    {"nombre": "Abril", "apellido": "Ríos", "dni": "34500015",
     "fecha_nacimiento": date(1993, 12, 1), "telefono": "+54 11 5555-3015"},
]

ACTIVIDADES_DATA = [
    {
        "nombre": "Pilates Reformer",
        "descripcion": "Clase de Pilates con máquina Reformer para mejorar flexibilidad, postura y fuerza del core.",
        "cupo_maximo": 8,
        "duracion_min": 50,
    },
    {
        "nombre": "Entrenamiento Integral",
        "descripcion": "Sesión de entrenamiento funcional que combina fuerza, resistencia y movilidad.",
        "cupo_maximo": 12,
        "duracion_min": 60,
    },
    {
        "nombre": "Fitness Pediátrico",
        "descripcion": "Programa de actividad física adaptado para niños y adolescentes.",
        "cupo_maximo": 10,
        "duracion_min": 45,
    },
    {
        "nombre": "Entrenamiento Cardiovascular",
        "descripcion": "Sesión de alta intensidad enfocada en mejorar la capacidad cardiovascular.",
        "cupo_maximo": 15,
        "duracion_min": 45,
    },
    {
        "nombre": "Active Recovery",
        "descripcion": "Clase de recuperación activa con estiramientos, movilidad articular y técnicas de relajación.",
        "cupo_maximo": 12,
        "duracion_min": 50,
    },
    {
        "nombre": "Readaptación Deportiva",
        "descripcion": "Programa personalizado de recuperación post-lesión y readaptación al deporte.",
        "cupo_maximo": 6,
        "duracion_min": 60,
    },
    {
        "nombre": "Nutrición Deportiva",
        "descripcion": "Consulta y seguimiento nutricional orientado al rendimiento y la salud.",
        "cupo_maximo": 1,
        "duracion_min": 40,
    },
]

PLANES_DATA = [
    {
        "nombre": "Básico",
        "descripcion": "Acceso a 1 actividad durante 30 días.",
        "precio": 15000.00,
        "duracion_dias": 30,
        "max_actividades": 1,
    },
    {
        "nombre": "Intermedio",
        "descripcion": "Acceso a hasta 3 actividades durante 30 días.",
        "precio": 25000.00,
        "duracion_dias": 30,
        "max_actividades": 3,
    },
    {
        "nombre": "Premium",
        "descripcion": "Acceso ilimitado a todas las actividades durante 30 días.",
        "precio": 35000.00,
        "duracion_dias": 30,
        "max_actividades": 99,
    },
]

# Schedule: each tuple is (activity_index, day, hour_start, room)
TURNOS_TEMPLATE = [
    # Pilates Reformer (idx 0) - 4 turnos
    (0, DiaSemana.LUNES, 8, "Sala Reformer"),
    (0, DiaSemana.MIERCOLES, 8, "Sala Reformer"),
    (0, DiaSemana.MARTES, 17, "Sala Reformer"),
    (0, DiaSemana.JUEVES, 17, "Sala Reformer"),
    # Entrenamiento Integral (idx 1) - 4 turnos
    (1, DiaSemana.LUNES, 10, "Sala Principal"),
    (1, DiaSemana.MIERCOLES, 10, "Sala Principal"),
    (1, DiaSemana.MARTES, 9, "Sala Principal"),
    (1, DiaSemana.JUEVES, 9, "Sala Principal"),
    # Fitness Pediátrico (idx 2) - 2 turnos
    (2, DiaSemana.MARTES, 15, "Sala Kids"),
    (2, DiaSemana.JUEVES, 15, "Sala Kids"),
    # Entrenamiento Cardiovascular (idx 3) - 4 turnos
    (3, DiaSemana.LUNES, 18, "Sala Cardio"),
    (3, DiaSemana.MIERCOLES, 18, "Sala Cardio"),
    (3, DiaSemana.VIERNES, 9, "Sala Cardio"),
    (3, DiaSemana.VIERNES, 18, "Sala Cardio"),
    # Active Recovery (idx 4) - 2 turnos
    (4, DiaSemana.MARTES, 11, "Sala Relax"),
    (4, DiaSemana.VIERNES, 11, "Sala Relax"),
    # Readaptación Deportiva (idx 5) - 2 turnos
    (5, DiaSemana.LUNES, 14, "Sala Readaptación"),
    (5, DiaSemana.MIERCOLES, 14, "Sala Readaptación"),
    # Nutrición Deportiva (idx 6) - 2 turnos
    (6, DiaSemana.MARTES, 10, "Consultorio 1"),
    (6, DiaSemana.JUEVES, 10, "Consultorio 1"),
]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _strip_accents(text: str) -> str:
    """Remove diacritical marks (accents) from text."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.category(c).startswith("M"))


def _make_user(data: dict, rol: RolUsuario) -> Usuario:
    email = data.get("email") or f"{_strip_accents(data['nombre']).lower()}.{_strip_accents(data['apellido']).lower()}@email.com"
    return Usuario(
        nombre=data["nombre"],
        apellido=data["apellido"],
        email=email,
        password_hash=hash_password(data.get("password", "alumno123")),
        telefono=data.get("telefono"),
        dni=data.get("dni"),
        fecha_nacimiento=data.get("fecha_nacimiento"),
        rol=rol,
        activo=True,
    )


def _weekdays_in_range(dia: DiaSemana, start: date, end: date) -> list[date]:
    """Return all dates matching dia_semana between start and end inclusive."""
    day_map = {
        DiaSemana.LUNES: 0,
        DiaSemana.MARTES: 1,
        DiaSemana.MIERCOLES: 2,
        DiaSemana.JUEVES: 3,
        DiaSemana.VIERNES: 4,
        DiaSemana.SABADO: 5,
        DiaSemana.DOMINGO: 6,
    }
    target = day_map[dia]
    current = start
    dates = []
    while current <= end:
        if current.weekday() == target:
            dates.append(current)
        current += timedelta(days=1)
    return dates


# ---------------------------------------------------------------------------
# Seeder
# ---------------------------------------------------------------------------

async def seed() -> None:
    """Populate the database with test data."""
    async with _db.engine.begin() as conn:
        await conn.run_sync(_db.Base.metadata.create_all)

    async with _db.async_session() as db:
        # Check if data already exists
        existing = await db.execute(select(Usuario).limit(1))
        if existing.scalar_one_or_none():
            print("Database already contains data. Skipping seed.")
            return

        random.seed(42)  # Reproducible data

        # --- Users ---
        admin = _make_user(ADMIN_DATA, RolUsuario.ADMIN)
        db.add(admin)

        profesores = []
        for p in PROFESORES_DATA:
            prof = _make_user(p, RolUsuario.PROFESOR)
            profesores.append(prof)
            db.add(prof)

        recepcionistas = []
        for r in RECEPCIONISTAS_DATA:
            recep = _make_user(r, RolUsuario.RECEPCIONISTA)
            recepcionistas.append(recep)
            db.add(recep)

        alumnos = []
        for a in ALUMNOS_DATA:
            alumno = _make_user(a, RolUsuario.ALUMNO)
            alumnos.append(alumno)
            db.add(alumno)

        await db.flush()
        print(f"Created {1 + len(profesores) + len(recepcionistas) + len(alumnos)} users")

        # --- Activities ---
        actividades = []
        for act_data in ACTIVIDADES_DATA:
            act = Actividad(**act_data)
            actividades.append(act)
            db.add(act)
        await db.flush()
        print(f"Created {len(actividades)} activities")

        # --- Plans ---
        planes = []
        for plan_data in PLANES_DATA:
            plan = Plan(**plan_data)
            planes.append(plan)
            db.add(plan)
        await db.flush()
        print(f"Created {len(planes)} plans")

        # --- Shifts (Turnos) ---
        turnos = []
        for act_idx, dia, hora, sala in TURNOS_TEMPLATE:
            actividad = actividades[act_idx]
            profesor = profesores[act_idx % len(profesores)]
            turno = Turno(
                actividad_id=actividad.id,
                profesor_id=profesor.id,
                dia_semana=dia,
                hora_inicio=time(hora, 0),
                hora_fin=time(hora + (actividad.duracion_min // 60),
                              actividad.duracion_min % 60),
                sala=sala,
                activo=True,
            )
            turnos.append(turno)
            db.add(turno)
        await db.flush()
        print(f"Created {len(turnos)} shifts")

        # --- Payments ---
        # Assign plans to students with varied statuses
        plan_basico, plan_intermedio, plan_premium = planes
        pagos = []

        # Active students with approved payments (10 students)
        for i, alumno in enumerate(alumnos[:10]):
            if i < 3:
                plan = plan_premium
            elif i < 7:
                plan = plan_intermedio
            else:
                plan = plan_basico

            pago = Pago(
                alumno_id=alumno.id,
                plan_id=plan.id,
                monto=float(plan.precio),
                fecha_pago=NOW - timedelta(days=random.randint(1, 20)),
                fecha_vencimiento=TODAY + timedelta(days=random.randint(5, 25)),
                estado=EstadoPago.APROBADO,
                metodo_pago=random.choice(list(MetodoPago)),
            )
            pagos.append(pago)
            db.add(pago)

        # Expired payment students (3 students)
        for alumno in alumnos[10:13]:
            plan = random.choice([plan_basico, plan_intermedio])
            pago = Pago(
                alumno_id=alumno.id,
                plan_id=plan.id,
                monto=float(plan.precio),
                fecha_pago=NOW - timedelta(days=45),
                fecha_vencimiento=TODAY - timedelta(days=random.randint(5, 15)),
                estado=EstadoPago.VENCIDO,
                metodo_pago=MetodoPago.EFECTIVO,
            )
            pagos.append(pago)
            db.add(pago)

        # Pending payment students (2 students)
        for alumno in alumnos[13:15]:
            plan = plan_basico
            pago = Pago(
                alumno_id=alumno.id,
                plan_id=plan.id,
                monto=float(plan.precio),
                fecha_pago=NOW - timedelta(days=2),
                fecha_vencimiento=TODAY + timedelta(days=28),
                estado=EstadoPago.PENDIENTE,
                metodo_pago=MetodoPago.MERCADOPAGO,
            )
            pagos.append(pago)
            db.add(pago)

        await db.flush()
        print(f"Created {len(pagos)} payments")

        # --- Enrollments ---
        inscripciones = []

        # Active students: enroll in 1-3 turnos based on their plan
        for i, alumno in enumerate(alumnos[:10]):
            if i < 3:
                num_turnos = 3
            elif i < 7:
                num_turnos = 2
            else:
                num_turnos = 1
            selected_turnos = random.sample(turnos, min(num_turnos, len(turnos)))
            for turno in selected_turnos:
                insc = Inscripcion(
                    alumno_id=alumno.id,
                    turno_id=turno.id,
                    estado=EstadoInscripcion.ACTIVA,
                    fecha_inscripcion=NOW - timedelta(days=random.randint(5, 25)),
                )
                inscripciones.append(insc)
                db.add(insc)

        # Expired students: cancelled enrollments
        for alumno in alumnos[10:13]:
            turno = random.choice(turnos)
            insc = Inscripcion(
                alumno_id=alumno.id,
                turno_id=turno.id,
                estado=EstadoInscripcion.CANCELADA,
                fecha_inscripcion=NOW - timedelta(days=40),
            )
            inscripciones.append(insc)
            db.add(insc)

        await db.flush()
        print(f"Created {len(inscripciones)} enrollments")

        # --- Waitlist ---
        # Put 2 students on waitlist for a popular turno (Pilates Reformer)
        pilates_turno = turnos[0]  # First Pilates turno
        lista_espera_entries = []
        for pos, alumno in enumerate(alumnos[13:15], start=1):
            entry = ListaEspera(
                alumno_id=alumno.id,
                turno_id=pilates_turno.id,
                posicion=pos,
                fecha=NOW - timedelta(days=3 - pos),
            )
            lista_espera_entries.append(entry)
            db.add(entry)
        await db.flush()
        print(f"Created {len(lista_espera_entries)} waitlist entries")

        # --- Attendance (last 4 weeks) ---
        four_weeks_ago = TODAY - timedelta(weeks=4)
        asistencias = []
        active_inscripciones = [i for i in inscripciones
                                if i.estado == EstadoInscripcion.ACTIVA]

        for insc in active_inscripciones:
            # Find the turno for this inscription
            turno = next(t for t in turnos if t.id == insc.turno_id)
            class_dates = _weekdays_in_range(turno.dia_semana, four_weeks_ago, TODAY)

            for class_date in class_dates:
                # ~80% attendance rate
                presente = random.random() < 0.80
                observacion = None
                if not presente:
                    observacion = random.choice([
                        "Ausente sin aviso",
                        "Avisó por enfermedad",
                        "Turno cancelado por lluvia",
                        None,
                    ])
                asist = Asistencia(
                    inscripcion_id=insc.id,
                    fecha=class_date,
                    presente=presente,
                    observacion=observacion,
                )
                asistencias.append(asist)
                db.add(asist)

        await db.flush()
        print(f"Created {len(asistencias)} attendance records")

        # --- Health Evaluations ---
        evaluaciones = []
        # Give evaluations to the first 8 active students
        for alumno in alumnos[:8]:
            profesor = random.choice(profesores)
            peso = round(random.uniform(55.0, 95.0), 2)
            altura = round(random.uniform(155.0, 190.0), 1)
            imc = round(peso / ((altura / 100) ** 2), 2)
            grasa = round(random.uniform(12.0, 30.0), 2)
            objetivo = random.choice([
                "Mejorar resistencia cardiovascular",
                "Pérdida de grasa corporal",
                "Ganancia de masa muscular",
                "Rehabilitación post-lesión",
                "Mejora de flexibilidad y movilidad",
                "Preparación para competencia",
            ])
            ev = EvaluacionSalud(
                alumno_id=alumno.id,
                profesional_id=profesor.id,
                fecha=NOW - timedelta(days=random.randint(1, 20)),
                peso_kg=peso,
                altura_cm=altura,
                imc=imc,
                grasa_corporal=grasa,
                objetivo=objetivo,
                notas=f"Evaluación inicial - {alumno.nombre} presenta buen estado general.",
            )
            evaluaciones.append(ev)
            db.add(ev)

        await db.flush()
        print(f"Created {len(evaluaciones)} health evaluations")

        # --- Notifications ---
        notificaciones = []
        notif_templates = [
            ("pago", "Tu pago ha sido registrado exitosamente."),
            ("turno", "Recordatorio: tu clase comienza en 1 hora."),
            ("inscripcion", "Te has inscripto exitosamente en un nuevo turno."),
            ("evaluacion", "Tu evaluación de salud está lista para consultar."),
            ("sistema", "Bienvenido/a a HSP-70 Gestión."),
        ]

        # Welcome notification for all students
        for alumno in alumnos:
            notif = Notificacion(
                usuario_id=alumno.id,
                tipo="sistema",
                mensaje="Bienvenido/a a HSP-70 Gestión. ¡Esperamos que disfrutes tu experiencia!",
                leida=random.choice([True, False]),
                fecha=NOW - timedelta(days=random.randint(10, 25)),
            )
            notificaciones.append(notif)
            db.add(notif)

        # Extra notifications for active students
        for alumno in alumnos[:10]:
            tipo, mensaje = random.choice(notif_templates[:4])
            notif = Notificacion(
                usuario_id=alumno.id,
                tipo=tipo,
                mensaje=mensaje,
                leida=random.choice([True, False]),
                fecha=NOW - timedelta(days=random.randint(0, 7)),
            )
            notificaciones.append(notif)
            db.add(notif)

        await db.flush()
        print(f"Created {len(notificaciones)} notifications")

        await db.commit()
        print("\nSeed completed successfully!")


async def clear_and_seed() -> None:
    """Drop all tables, recreate them, and seed."""
    async with _db.engine.begin() as conn:
        await conn.run_sync(_db.Base.metadata.drop_all)
        await conn.run_sync(_db.Base.metadata.create_all)

    # Re-run seed on a fresh database
    await seed()


if __name__ == "__main__":
    asyncio.run(seed())
