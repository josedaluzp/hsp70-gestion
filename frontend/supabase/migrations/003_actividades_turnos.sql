CREATE TABLE actividades (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre       text NOT NULL UNIQUE,
  descripcion  text,
  cupo_maximo  integer NOT NULL CHECK (cupo_maximo > 0),
  duracion_min integer NOT NULL CHECK (duracion_min > 0),
  activa       boolean NOT NULL DEFAULT true
);

CREATE TABLE turnos (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  actividad_id bigint NOT NULL REFERENCES actividades(id),
  profesor_id  uuid NOT NULL REFERENCES usuarios(id),
  dia_semana   dia_semana NOT NULL,
  hora_inicio  time NOT NULL,
  hora_fin     time NOT NULL,
  sala         text,
  activo       boolean NOT NULL DEFAULT true
);
