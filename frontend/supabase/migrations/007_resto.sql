CREATE TABLE planes (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre      text NOT NULL UNIQUE,
  creditos    integer NOT NULL CHECK (creditos > 0),
  precio      numeric(10,2) NOT NULL CHECK (precio >= 0),
  descripcion text
);

CREATE TABLE evaluaciones (
  id                 bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id          uuid NOT NULL REFERENCES usuarios(id),
  profesor_id        uuid NOT NULL REFERENCES usuarios(id),
  fecha              date NOT NULL,
  peso_kg            numeric(5,2),
  altura_cm          numeric(5,2),
  imc                numeric(5,2),
  grasa_corporal_pct numeric(5,2),
  notas              text
);

CREATE TABLE notificaciones (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  titulo     text NOT NULL,
  mensaje    text NOT NULL,
  leida      boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
