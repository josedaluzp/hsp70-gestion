"""Tests for SQLAlchemy models: table creation, FKs, enums, and relationships."""

from datetime import date, time

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models import (
    Actividad,
    Asistencia,
    EvaluacionSalud,
    Inscripcion,
    ListaEspera,
    Notificacion,
    Plan,
    Turno,
    Usuario,
)
from app.models.enums import (
    DiaSemana,
    EstadoInscripcion,
    RolUsuario,
)

EXPECTED_TABLES = {
    "usuarios",
    "actividades",
    "turnos",
    "inscripciones",
    "asistencias",
    "planes",
    "evaluaciones_salud",
    "lista_espera",
    "notificaciones",
}


@pytest.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA foreign_keys=ON"))
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db(db_engine):
    session_factory = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


# ---------------------------------------------------------------------------
# Table creation tests
# ---------------------------------------------------------------------------


class TestTableCreation:
    async def test_all_tables_created(self, db_engine):
        async with db_engine.connect() as conn:
            table_names = await conn.run_sync(
                lambda sync_conn: set(inspect(sync_conn).get_table_names())
            )
        assert EXPECTED_TABLES.issubset(table_names)

    async def test_table_count(self, db_engine):
        async with db_engine.connect() as conn:
            table_names = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_table_names()
            )
        assert len([t for t in table_names if t in EXPECTED_TABLES]) == 9


# ---------------------------------------------------------------------------
# Enum validation tests
# ---------------------------------------------------------------------------


class TestEnums:
    def test_rol_usuario_values(self):
        assert set(r.value for r in RolUsuario) == {
            "alumno", "profesor", "recepcionista", "admin"
        }

    def test_estado_inscripcion_values(self):
        assert set(e.value for e in EstadoInscripcion) == {
            "activa", "cancelada", "lista_espera"
        }

    def test_dia_semana_values(self):
        assert len(DiaSemana) == 7


# ---------------------------------------------------------------------------
# Foreign key tests
# ---------------------------------------------------------------------------


class TestForeignKeys:
    async def test_turno_requires_actividad_and_profesor(self, db_engine):
        async with db_engine.connect() as conn:
            fks = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_foreign_keys("turnos")
            )
        fk_columns = {fk["constrained_columns"][0] for fk in fks}
        assert "actividad_id" in fk_columns
        assert "profesor_id" in fk_columns

    async def test_inscripcion_fks(self, db_engine):
        async with db_engine.connect() as conn:
            fks = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_foreign_keys("inscripciones")
            )
        fk_columns = {fk["constrained_columns"][0] for fk in fks}
        assert {"alumno_id", "turno_id"} == fk_columns

    async def test_asistencia_fk(self, db_engine):
        async with db_engine.connect() as conn:
            fks = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_foreign_keys("asistencias")
            )
        assert fks[0]["constrained_columns"] == ["inscripcion_id"]

    async def test_evaluacion_salud_fks(self, db_engine):
        async with db_engine.connect() as conn:
            fks = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_foreign_keys("evaluaciones_salud")
            )
        fk_columns = {fk["constrained_columns"][0] for fk in fks}
        assert {"alumno_id", "profesional_id"} == fk_columns

    async def test_lista_espera_fks(self, db_engine):
        async with db_engine.connect() as conn:
            fks = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_foreign_keys("lista_espera")
            )
        fk_columns = {fk["constrained_columns"][0] for fk in fks}
        assert {"alumno_id", "turno_id"} == fk_columns

    async def test_notificacion_fk(self, db_engine):
        async with db_engine.connect() as conn:
            fks = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_foreign_keys("notificaciones")
            )
        assert fks[0]["constrained_columns"] == ["usuario_id"]


# ---------------------------------------------------------------------------
# Model instance and relationship tests
# ---------------------------------------------------------------------------


class TestModelInstances:
    async def test_create_usuario(self, db):
        usuario = Usuario(
            nombre="Juan",
            apellido="Perez",
            email="juan@test.com",
            password_hash="hashed",
            rol=RolUsuario.ALUMNO,
        )
        db.add(usuario)
        await db.flush()
        assert usuario.id is not None
        assert usuario.activo is True

    async def test_create_actividad(self, db):
        actividad = Actividad(
            nombre="Musculacion",
            cupo_maximo=30,
            duracion_min=60,
        )
        db.add(actividad)
        await db.flush()
        assert actividad.id is not None
        assert actividad.activa is True

    async def test_create_turno_with_relationships(self, db):
        profesor = Usuario(
            nombre="Maria", apellido="Lopez", email="maria@test.com",
            password_hash="hashed", rol=RolUsuario.PROFESOR,
        )
        actividad = Actividad(
            nombre="Yoga", cupo_maximo=20, duracion_min=45,
        )
        db.add_all([profesor, actividad])
        await db.flush()

        turno = Turno(
            actividad_id=actividad.id,
            profesor_id=profesor.id,
            dia_semana=DiaSemana.LUNES,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
            sala="Sala A",
        )
        db.add(turno)
        await db.flush()
        assert turno.id is not None

    async def test_create_inscripcion(self, db):
        alumno = Usuario(
            nombre="Carlos", apellido="Garcia", email="carlos@test.com",
            password_hash="hashed", rol=RolUsuario.ALUMNO,
        )
        profesor = Usuario(
            nombre="Ana", apellido="Martinez", email="ana@test.com",
            password_hash="hashed", rol=RolUsuario.PROFESOR,
        )
        actividad = Actividad(
            nombre="Pilates", cupo_maximo=15, duracion_min=50,
        )
        db.add_all([alumno, profesor, actividad])
        await db.flush()

        turno = Turno(
            actividad_id=actividad.id, profesor_id=profesor.id,
            dia_semana=DiaSemana.MARTES, hora_inicio=time(10, 0),
            hora_fin=time(11, 0),
        )
        db.add(turno)
        await db.flush()

        inscripcion = Inscripcion(
            alumno_id=alumno.id, turno_id=turno.id,
            estado=EstadoInscripcion.ACTIVA,
        )
        db.add(inscripcion)
        await db.flush()
        assert inscripcion.id is not None

    async def test_create_asistencia(self, db):
        alumno = Usuario(
            nombre="Pedro", apellido="Diaz", email="pedro@test.com",
            password_hash="hashed",
        )
        profesor = Usuario(
            nombre="Laura", apellido="Ruiz", email="laura@test.com",
            password_hash="hashed", rol=RolUsuario.PROFESOR,
        )
        actividad = Actividad(
            nombre="Spinning", cupo_maximo=25, duracion_min=40,
        )
        db.add_all([alumno, profesor, actividad])
        await db.flush()

        turno = Turno(
            actividad_id=actividad.id, profesor_id=profesor.id,
            dia_semana=DiaSemana.MIERCOLES, hora_inicio=time(8, 0),
            hora_fin=time(9, 0),
        )
        db.add(turno)
        await db.flush()

        inscripcion = Inscripcion(
            alumno_id=alumno.id, turno_id=turno.id,
        )
        db.add(inscripcion)
        await db.flush()

        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=True,
        )
        db.add(asistencia)
        await db.flush()
        assert asistencia.id is not None

    async def test_create_evaluacion_salud(self, db):
        alumno = Usuario(
            nombre="Sofia", apellido="Torres", email="sofia@test.com",
            password_hash="hashed",
        )
        profesional = Usuario(
            nombre="Dr. Roberto", apellido="Sanchez",
            email="roberto@test.com", password_hash="hashed",
            rol=RolUsuario.PROFESOR,
        )
        db.add_all([alumno, profesional])
        await db.flush()

        evaluacion = EvaluacionSalud(
            alumno_id=alumno.id, profesional_id=profesional.id,
            peso_kg=70.5, altura_cm=175.0, imc=23.02,
            grasa_corporal=18.5, objetivo="Tonificar",
        )
        db.add(evaluacion)
        await db.flush()
        assert evaluacion.id is not None

    async def test_create_lista_espera(self, db):
        alumno = Usuario(
            nombre="Marta", apellido="Gomez", email="marta@test.com",
            password_hash="hashed",
        )
        profesor = Usuario(
            nombre="Pablo", apellido="Herrera", email="pablo@test.com",
            password_hash="hashed", rol=RolUsuario.PROFESOR,
        )
        actividad = Actividad(
            nombre="CrossFit", cupo_maximo=10, duracion_min=60,
        )
        db.add_all([alumno, profesor, actividad])
        await db.flush()

        turno = Turno(
            actividad_id=actividad.id, profesor_id=profesor.id,
            dia_semana=DiaSemana.JUEVES, hora_inicio=time(17, 0),
            hora_fin=time(18, 0),
        )
        db.add(turno)
        await db.flush()

        espera = ListaEspera(
            alumno_id=alumno.id, turno_id=turno.id, posicion=1,
        )
        db.add(espera)
        await db.flush()
        assert espera.id is not None

    async def test_create_notificacion(self, db):
        usuario = Usuario(
            nombre="Elena", apellido="Castro", email="elena@test.com",
            password_hash="hashed",
        )
        db.add(usuario)
        await db.flush()

        notificacion = Notificacion(
            usuario_id=usuario.id,
            tipo="inscripcion",
            mensaje="Te inscribiste exitosamente al turno de Yoga.",
        )
        db.add(notificacion)
        await db.flush()
        assert notificacion.id is not None
        assert notificacion.leida is False


# ---------------------------------------------------------------------------
# Unique constraint tests
# ---------------------------------------------------------------------------


class TestConstraints:
    async def test_usuario_email_unique(self, db):
        u1 = Usuario(
            nombre="A", apellido="B", email="same@test.com",
            password_hash="h",
        )
        u2 = Usuario(
            nombre="C", apellido="D", email="same@test.com",
            password_hash="h",
        )
        db.add_all([u1, u2])
        with pytest.raises(Exception):
            await db.flush()

    async def test_inscripcion_unique_alumno_turno(self, db):
        alumno = Usuario(
            nombre="X", apellido="Y", email="xy@test.com",
            password_hash="h",
        )
        profesor = Usuario(
            nombre="P", apellido="Q", email="pq@test.com",
            password_hash="h", rol=RolUsuario.PROFESOR,
        )
        actividad = Actividad(
            nombre="Boxeo", cupo_maximo=10, duracion_min=60,
        )
        db.add_all([alumno, profesor, actividad])
        await db.flush()

        turno = Turno(
            actividad_id=actividad.id, profesor_id=profesor.id,
            dia_semana=DiaSemana.VIERNES, hora_inicio=time(19, 0),
            hora_fin=time(20, 0),
        )
        db.add(turno)
        await db.flush()

        i1 = Inscripcion(alumno_id=alumno.id, turno_id=turno.id)
        db.add(i1)
        await db.flush()

        i2 = Inscripcion(alumno_id=alumno.id, turno_id=turno.id)
        db.add(i2)
        with pytest.raises(Exception):
            await db.flush()


# ---------------------------------------------------------------------------
# Repr tests
# ---------------------------------------------------------------------------


class TestRepr:
    def test_usuario_repr(self):
        u = Usuario(nombre="Juan", apellido="Perez")
        u.id = 1
        assert "Juan" in repr(u)

    def test_actividad_repr(self):
        a = Actividad(nombre="Yoga")
        a.id = 1
        assert "Yoga" in repr(a)


