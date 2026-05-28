CREATE TABLE transacciones_creditos (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id),
  tipo        tipo_transaccion NOT NULL,
  cantidad    integer NOT NULL,
  descripcion text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE asistencias (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  inscripcion_id bigint NOT NULL REFERENCES inscripciones(id),
  fecha          date NOT NULL,
  presente       boolean NOT NULL DEFAULT false,
  observacion    text,
  UNIQUE(inscripcion_id, fecha)
);
