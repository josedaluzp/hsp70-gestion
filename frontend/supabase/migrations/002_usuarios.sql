CREATE TABLE usuarios (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre           text NOT NULL,
  apellido         text NOT NULL,
  email            text NOT NULL UNIQUE,
  telefono         text,
  dni              text UNIQUE,
  fecha_nacimiento date,
  rol              rol_usuario NOT NULL DEFAULT 'alumno',
  activo           boolean NOT NULL DEFAULT true,
  creditos         integer NOT NULL DEFAULT 0 CHECK (creditos >= 0),
  created_at       timestamptz NOT NULL DEFAULT now()
);
