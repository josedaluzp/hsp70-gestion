import enum


class RolUsuario(str, enum.Enum):
    ALUMNO = "alumno"
    PROFESOR = "profesor"
    RECEPCIONISTA = "recepcionista"
    ADMIN = "admin"


class EstadoInscripcion(str, enum.Enum):
    ACTIVA = "activa"
    CANCELADA = "cancelada"
    LISTA_ESPERA = "lista_espera"


class DiaSemana(str, enum.Enum):
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"
    DOMINGO = "domingo"
