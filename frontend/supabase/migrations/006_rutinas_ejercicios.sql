CREATE TABLE ejercicios (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre         text NOT NULL UNIQUE,
  descripcion    text,
  grupo_muscular text,
  video_url      text
);

CREATE TABLE rutinas (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre      text NOT NULL,
  descripcion text,
  profesor_id uuid NOT NULL REFERENCES usuarios(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ejercicios_rutina (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rutina_id     bigint NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  ejercicio_id  bigint NOT NULL REFERENCES ejercicios(id),
  series        integer,
  repeticiones  integer,
  duracion_seg  integer,
  descanso_seg  integer,
  orden         integer NOT NULL DEFAULT 0,
  notas         text,
  UNIQUE(rutina_id, ejercicio_id)
);

CREATE TABLE rutinas_alumnos (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rutina_id   bigint NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  alumno_id   uuid NOT NULL REFERENCES usuarios(id),
  asignada_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rutina_id, alumno_id)
);
