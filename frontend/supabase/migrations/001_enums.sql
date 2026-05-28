CREATE TYPE rol_usuario AS ENUM ('admin', 'profesor', 'recepcionista', 'alumno');
CREATE TYPE estado_inscripcion AS ENUM ('activa', 'cancelada', 'lista_espera');
CREATE TYPE dia_semana AS ENUM ('lunes','martes','miercoles','jueves','viernes','sabado','domingo');
CREATE TYPE tipo_transaccion AS ENUM ('compra','consumo','devolucion','ajuste_manual');
