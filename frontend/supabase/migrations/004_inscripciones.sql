CREATE TABLE inscripciones (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id         uuid NOT NULL REFERENCES usuarios(id),
  turno_id          bigint NOT NULL REFERENCES turnos(id),
  estado            estado_inscripcion NOT NULL DEFAULT 'activa',
  fecha_inscripcion timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, turno_id)
);

CREATE TABLE lista_espera (
  id        bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id uuid NOT NULL REFERENCES usuarios(id),
  turno_id  bigint NOT NULL REFERENCES turnos(id),
  posicion  integer NOT NULL,
  fecha     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, turno_id)
);
