-- 012_metricas.sql — Flag de pausa (inactivo) y marca temporal de baja

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS en_pausa boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS baja_at timestamptz;
