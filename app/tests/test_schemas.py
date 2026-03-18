from datetime import date, datetime, time

import pytest
from pydantic import ValidationError

from app.models.enums import (
    DiaSemana,
    EstadoInscripcion,
    EstadoPago,
    MetodoPago,
)
from app.schemas import (
    ActividadCreate,
    ActividadRead,
    AsistenciaCreate,
    AsistenciaRead,
    EvaluacionSaludCreate,
    EvaluacionSaludRead,
    InscripcionCreate,
    InscripcionRead,
    ListaEsperaCreate,
    ListaEsperaRead,
    NotificacionCreate,
    NotificacionRead,
    PagoCreate,
    PagoRead,
    PlanCreate,
    PlanRead,
    TurnoCreate,
    TurnoRead,
    UserCreate,
    UserRead,
    UserUpdate,
)

# --- Usuario schemas ---


class TestUserCreate:
    def test_valid_user(self):
        user = UserCreate(
            nombre="Juan",
            apellido="Pérez",
            email="juan@example.com",
            password="secret123",
        )
        assert user.nombre == "Juan"
        assert user.rol == "alumno"

    def test_valid_user_with_all_fields(self):
        user = UserCreate(
            nombre="María",
            apellido="García",
            email="maria@example.com",
            password="secret123",
            telefono="1155667788",
            dni="12345678",
            fecha_nacimiento=date(1990, 5, 15),
            rol="profesor",
        )
        assert user.dni == "12345678"
        assert user.fecha_nacimiento == date(1990, 5, 15)

    def test_invalid_email(self):
        with pytest.raises(ValidationError, match="email"):
            UserCreate(
                nombre="Juan",
                apellido="Pérez",
                email="not-an-email",
                password="secret123",
            )

    def test_short_password(self):
        with pytest.raises(ValidationError, match="password"):
            UserCreate(
                nombre="Juan",
                apellido="Pérez",
                email="juan@example.com",
                password="short",
            )

    def test_empty_nombre(self):
        with pytest.raises(ValidationError, match="nombre"):
            UserCreate(
                nombre="",
                apellido="Pérez",
                email="juan@example.com",
                password="secret123",
            )

    def test_dni_7_digits(self):
        user = UserCreate(
            nombre="Ana",
            apellido="López",
            email="ana@example.com",
            password="secret123",
            dni="1234567",
        )
        assert user.dni == "1234567"

    def test_dni_8_digits(self):
        user = UserCreate(
            nombre="Ana",
            apellido="López",
            email="ana@example.com",
            password="secret123",
            dni="12345678",
        )
        assert user.dni == "12345678"

    def test_dni_with_dots(self):
        user = UserCreate(
            nombre="Ana",
            apellido="López",
            email="ana@example.com",
            password="secret123",
            dni="12.345.678",
        )
        assert user.dni == "12345678"

    def test_invalid_dni_letters(self):
        with pytest.raises(ValidationError, match="DNI must be 7 or 8 digits"):
            UserCreate(
                nombre="Ana",
                apellido="López",
                email="ana@example.com",
                password="secret123",
                dni="ABC12345",
            )

    def test_invalid_dni_too_short(self):
        with pytest.raises(ValidationError, match="DNI must be 7 or 8 digits"):
            UserCreate(
                nombre="Ana",
                apellido="López",
                email="ana@example.com",
                password="secret123",
                dni="123",
            )

    def test_future_birth_date(self):
        with pytest.raises(ValidationError, match="Birth date cannot be in the future"):
            UserCreate(
                nombre="Ana",
                apellido="López",
                email="ana@example.com",
                password="secret123",
                fecha_nacimiento=date(2099, 1, 1),
            )


class TestUserRead:
    def test_from_attributes(self):
        assert UserRead.model_config["from_attributes"] is True

    def test_valid_read(self):
        user = UserRead(
            id=1,
            nombre="Juan",
            apellido="Pérez",
            email="juan@example.com",
            telefono=None,
            dni=None,
            fecha_nacimiento=None,
            rol="alumno",
            activo=True,
            created_at=datetime(2024, 1, 1),
        )
        assert user.id == 1


class TestUserUpdate:
    def test_all_optional(self):
        update = UserUpdate()
        assert update.nombre is None
        assert update.email is None

    def test_partial_update(self):
        update = UserUpdate(nombre="NuevoNombre")
        assert update.nombre == "NuevoNombre"
        assert update.apellido is None

    def test_invalid_email_update(self):
        with pytest.raises(ValidationError, match="email"):
            UserUpdate(email="not-valid")

    def test_invalid_dni_update(self):
        with pytest.raises(ValidationError, match="DNI must be 7 or 8 digits"):
            UserUpdate(dni="ABC")


# --- Actividad schemas ---


class TestActividadCreate:
    def test_valid(self):
        act = ActividadCreate(
            nombre="Yoga",
            cupo_maximo=20,
            duracion_min=60,
        )
        assert act.activa is True

    def test_cupo_must_be_positive(self):
        with pytest.raises(ValidationError, match="cupo_maximo"):
            ActividadCreate(nombre="Yoga", cupo_maximo=0, duracion_min=60)

    def test_duracion_must_be_positive(self):
        with pytest.raises(ValidationError, match="duracion_min"):
            ActividadCreate(nombre="Yoga", cupo_maximo=20, duracion_min=0)

    def test_duracion_max_480(self):
        with pytest.raises(ValidationError, match="duracion_min"):
            ActividadCreate(nombre="Yoga", cupo_maximo=20, duracion_min=481)

    def test_empty_nombre(self):
        with pytest.raises(ValidationError, match="nombre"):
            ActividadCreate(nombre="", cupo_maximo=20, duracion_min=60)


class TestActividadRead:
    def test_from_attributes(self):
        assert ActividadRead.model_config["from_attributes"] is True

    def test_valid_read(self):
        act = ActividadRead(
            id=1,
            nombre="Yoga",
            descripcion="Clase de yoga",
            cupo_maximo=20,
            duracion_min=60,
            activa=True,
        )
        assert act.id == 1


# --- Turno schemas ---


class TestTurnoCreate:
    def test_valid(self):
        turno = TurnoCreate(
            actividad_id=1,
            profesor_id=2,
            dia_semana=DiaSemana.LUNES,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
        )
        assert turno.activo is True

    def test_hora_fin_before_inicio(self):
        with pytest.raises(ValidationError, match="hora_fin must be after hora_inicio"):
            TurnoCreate(
                actividad_id=1,
                profesor_id=2,
                dia_semana=DiaSemana.LUNES,
                hora_inicio=time(10, 0),
                hora_fin=time(9, 0),
            )

    def test_hora_fin_equal_inicio(self):
        with pytest.raises(ValidationError, match="hora_fin must be after hora_inicio"):
            TurnoCreate(
                actividad_id=1,
                profesor_id=2,
                dia_semana=DiaSemana.LUNES,
                hora_inicio=time(10, 0),
                hora_fin=time(10, 0),
            )

    def test_invalid_dia_semana(self):
        with pytest.raises(ValidationError, match="dia_semana"):
            TurnoCreate(
                actividad_id=1,
                profesor_id=2,
                dia_semana="invalid",
                hora_inicio=time(9, 0),
                hora_fin=time(10, 0),
            )

    def test_actividad_id_positive(self):
        with pytest.raises(ValidationError, match="actividad_id"):
            TurnoCreate(
                actividad_id=0,
                profesor_id=2,
                dia_semana=DiaSemana.LUNES,
                hora_inicio=time(9, 0),
                hora_fin=time(10, 0),
            )


class TestTurnoRead:
    def test_from_attributes(self):
        assert TurnoRead.model_config["from_attributes"] is True


# --- Inscripcion schemas ---


class TestInscripcionCreate:
    def test_valid(self):
        insc = InscripcionCreate(alumno_id=1, turno_id=1)
        assert insc.estado == EstadoInscripcion.ACTIVA

    def test_alumno_id_positive(self):
        with pytest.raises(ValidationError, match="alumno_id"):
            InscripcionCreate(alumno_id=0, turno_id=1)

    def test_turno_id_positive(self):
        with pytest.raises(ValidationError, match="turno_id"):
            InscripcionCreate(alumno_id=1, turno_id=-1)


class TestInscripcionRead:
    def test_from_attributes(self):
        assert InscripcionRead.model_config["from_attributes"] is True

    def test_valid_read(self):
        insc = InscripcionRead(
            id=1,
            alumno_id=1,
            turno_id=1,
            estado=EstadoInscripcion.ACTIVA,
            fecha_inscripcion=datetime(2024, 1, 1),
        )
        assert insc.id == 1


# --- Asistencia schemas ---


class TestAsistenciaCreate:
    def test_valid(self):
        asist = AsistenciaCreate(
            inscripcion_id=1,
            fecha=date(2024, 6, 15),
        )
        assert asist.presente is False

    def test_inscripcion_id_positive(self):
        with pytest.raises(ValidationError, match="inscripcion_id"):
            AsistenciaCreate(inscripcion_id=0, fecha=date(2024, 6, 15))


class TestAsistenciaRead:
    def test_from_attributes(self):
        assert AsistenciaRead.model_config["from_attributes"] is True


# --- Plan schemas ---


class TestPlanCreate:
    def test_valid(self):
        plan = PlanCreate(
            nombre="Plan Básico",
            precio=5000.0,
            duracion_dias=30,
            max_actividades=3,
        )
        assert plan.descripcion is None

    def test_precio_positive(self):
        with pytest.raises(ValidationError, match="precio"):
            PlanCreate(
                nombre="Plan",
                precio=0,
                duracion_dias=30,
                max_actividades=3,
            )

    def test_duracion_positive(self):
        with pytest.raises(ValidationError, match="duracion_dias"):
            PlanCreate(
                nombre="Plan",
                precio=5000.0,
                duracion_dias=0,
                max_actividades=3,
            )

    def test_empty_nombre(self):
        with pytest.raises(ValidationError, match="nombre"):
            PlanCreate(
                nombre="",
                precio=5000.0,
                duracion_dias=30,
                max_actividades=3,
            )


class TestPlanRead:
    def test_from_attributes(self):
        assert PlanRead.model_config["from_attributes"] is True


# --- Pago schemas ---


class TestPagoCreate:
    def test_valid(self):
        pago = PagoCreate(
            alumno_id=1,
            plan_id=1,
            monto=5000.0,
            fecha_vencimiento=date(2099, 12, 31),
            metodo_pago=MetodoPago.EFECTIVO,
        )
        assert pago.estado == EstadoPago.PENDIENTE

    def test_monto_positive(self):
        with pytest.raises(ValidationError, match="monto"):
            PagoCreate(
                alumno_id=1,
                plan_id=1,
                monto=0,
                fecha_vencimiento=date(2099, 12, 31),
                metodo_pago=MetodoPago.EFECTIVO,
            )

    def test_past_fecha_vencimiento(self):
        with pytest.raises(ValidationError, match="Due date cannot be in the past"):
            PagoCreate(
                alumno_id=1,
                plan_id=1,
                monto=5000.0,
                fecha_vencimiento=date(2000, 1, 1),
                metodo_pago=MetodoPago.EFECTIVO,
            )

    def test_invalid_metodo_pago(self):
        with pytest.raises(ValidationError, match="metodo_pago"):
            PagoCreate(
                alumno_id=1,
                plan_id=1,
                monto=5000.0,
                fecha_vencimiento=date(2099, 12, 31),
                metodo_pago="bitcoin",
            )


class TestPagoRead:
    def test_from_attributes(self):
        assert PagoRead.model_config["from_attributes"] is True

    def test_valid_read(self):
        pago = PagoRead(
            id=1,
            alumno_id=1,
            plan_id=1,
            monto=5000.0,
            fecha_pago=datetime(2024, 1, 1),
            fecha_vencimiento=date(2024, 2, 1),
            estado=EstadoPago.PENDIENTE,
            mp_payment_id=None,
            metodo_pago=MetodoPago.EFECTIVO,
        )
        assert pago.id == 1


# --- EvaluacionSalud schemas ---


class TestEvaluacionSaludCreate:
    def test_valid_minimal(self):
        ev = EvaluacionSaludCreate(alumno_id=1, profesional_id=2)
        assert ev.peso_kg is None

    def test_valid_full(self):
        ev = EvaluacionSaludCreate(
            alumno_id=1,
            profesional_id=2,
            peso_kg=75.5,
            altura_cm=175.0,
            imc=24.6,
            grasa_corporal=18.5,
            objetivo="Perder grasa",
            notas="Buena condición",
        )
        assert ev.peso_kg == 75.5

    def test_peso_must_be_positive(self):
        with pytest.raises(ValidationError, match="peso_kg"):
            EvaluacionSaludCreate(
                alumno_id=1, profesional_id=2, peso_kg=-1
            )

    def test_peso_max(self):
        with pytest.raises(ValidationError, match="peso_kg"):
            EvaluacionSaludCreate(
                alumno_id=1, profesional_id=2, peso_kg=501
            )

    def test_altura_must_be_positive(self):
        with pytest.raises(ValidationError, match="altura_cm"):
            EvaluacionSaludCreate(
                alumno_id=1, profesional_id=2, altura_cm=0
            )

    def test_altura_max(self):
        with pytest.raises(ValidationError, match="altura_cm"):
            EvaluacionSaludCreate(
                alumno_id=1, profesional_id=2, altura_cm=301
            )

    def test_grasa_corporal_range(self):
        with pytest.raises(ValidationError, match="grasa_corporal"):
            EvaluacionSaludCreate(
                alumno_id=1, profesional_id=2, grasa_corporal=101
            )

    def test_grasa_corporal_zero_valid(self):
        ev = EvaluacionSaludCreate(
            alumno_id=1, profesional_id=2, grasa_corporal=0
        )
        assert ev.grasa_corporal == 0


class TestEvaluacionSaludRead:
    def test_from_attributes(self):
        assert EvaluacionSaludRead.model_config["from_attributes"] is True


# --- ListaEspera schemas ---


class TestListaEsperaCreate:
    def test_valid(self):
        le = ListaEsperaCreate(alumno_id=1, turno_id=1, posicion=1)
        assert le.posicion == 1

    def test_posicion_positive(self):
        with pytest.raises(ValidationError, match="posicion"):
            ListaEsperaCreate(alumno_id=1, turno_id=1, posicion=0)


class TestListaEsperaRead:
    def test_from_attributes(self):
        assert ListaEsperaRead.model_config["from_attributes"] is True

    def test_valid_read(self):
        le = ListaEsperaRead(
            id=1,
            alumno_id=1,
            turno_id=1,
            posicion=1,
            fecha=datetime(2024, 1, 1),
        )
        assert le.id == 1


# --- Notificacion schemas ---


class TestNotificacionCreate:
    def test_valid(self):
        notif = NotificacionCreate(
            usuario_id=1,
            tipo="pago",
            mensaje="Tu pago fue aprobado",
        )
        assert notif.leida is False

    def test_tipo_not_empty(self):
        with pytest.raises(ValidationError, match="tipo"):
            NotificacionCreate(
                usuario_id=1,
                tipo="",
                mensaje="Mensaje",
            )

    def test_mensaje_not_empty(self):
        with pytest.raises(ValidationError, match="mensaje"):
            NotificacionCreate(
                usuario_id=1,
                tipo="pago",
                mensaje="",
            )

    def test_usuario_id_positive(self):
        with pytest.raises(ValidationError, match="usuario_id"):
            NotificacionCreate(
                usuario_id=0,
                tipo="pago",
                mensaje="Mensaje",
            )


class TestNotificacionRead:
    def test_from_attributes(self):
        assert NotificacionRead.model_config["from_attributes"] is True

    def test_valid_read(self):
        notif = NotificacionRead(
            id=1,
            usuario_id=1,
            tipo="pago",
            mensaje="Mensaje",
            leida=False,
            fecha=datetime(2024, 1, 1),
        )
        assert notif.id == 1
