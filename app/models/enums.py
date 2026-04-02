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


class EstadoPago(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    VENCIDO = "vencido"


class MetodoPago(str, enum.Enum):
    MERCADOPAGO = "mercadopago"
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"


class TipoPago(str, enum.Enum):
    UNICO = "unico"
    SUSCRIPCION = "suscripcion"


class DiaSemana(str, enum.Enum):
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"
    DOMINGO = "domingo"
