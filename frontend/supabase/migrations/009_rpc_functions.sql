-- Inscribir alumno: atomic enrollment or waitlist
CREATE OR REPLACE FUNCTION inscribir_alumno(
  p_alumno_id uuid,
  p_turno_id  bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creditos       integer;
  v_cupo_maximo    integer;
  v_activos        integer;
  v_ya_inscripto   boolean;
  v_inscripcion_id bigint;
  v_posicion       integer;
BEGIN
  SELECT creditos INTO v_creditos FROM usuarios WHERE id = p_alumno_id FOR UPDATE;
  IF v_creditos IS NULL THEN
    RAISE EXCEPTION 'alumno_not_found';
  END IF;
  IF v_creditos < 1 THEN
    RAISE EXCEPTION 'sin_creditos';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM inscripciones
    WHERE alumno_id = p_alumno_id AND turno_id = p_turno_id AND estado = 'activa'
  ) INTO v_ya_inscripto;
  IF v_ya_inscripto THEN
    RAISE EXCEPTION 'ya_inscripto';
  END IF;

  SELECT a.cupo_maximo INTO v_cupo_maximo
    FROM actividades a JOIN turnos t ON t.actividad_id = a.id WHERE t.id = p_turno_id;
  SELECT COUNT(*) INTO v_activos
    FROM inscripciones WHERE turno_id = p_turno_id AND estado = 'activa';

  IF v_activos < v_cupo_maximo THEN
    UPDATE usuarios SET creditos = creditos - 1 WHERE id = p_alumno_id;
    INSERT INTO inscripciones (alumno_id, turno_id, estado)
      VALUES (p_alumno_id, p_turno_id, 'activa')
      RETURNING id INTO v_inscripcion_id;
    INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
      VALUES (p_alumno_id, 'consumo', 1, 'Inscripción a turno ' || p_turno_id);
    RETURN jsonb_build_object('resultado', 'inscripto', 'inscripcion_id', v_inscripcion_id);
  ELSE
    SELECT COALESCE(MAX(posicion), 0) + 1 INTO v_posicion
      FROM lista_espera WHERE turno_id = p_turno_id;
    INSERT INTO lista_espera (alumno_id, turno_id, posicion)
      VALUES (p_alumno_id, p_turno_id, v_posicion);
    RETURN jsonb_build_object('resultado', 'en_lista_espera', 'posicion', v_posicion);
  END IF;
END;
$$;

-- Cancelar inscripcion: refund + waitlist promotion
CREATE OR REPLACE FUNCTION cancelar_inscripcion(
  p_inscripcion_id bigint,
  p_usuario_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insc       RECORD;
  v_rol        rol_usuario;
  v_proxima    timestamptz;
  v_devolver   boolean := false;
  v_promovido  RECORD;
  v_diff_days  integer;
  v_dia_num    integer;
  v_hoy_num    integer;
BEGIN
  SELECT i.id, i.alumno_id, i.turno_id, t.dia_semana, t.hora_inicio
    INTO v_insc
    FROM inscripciones i
    JOIN turnos t ON t.id = i.turno_id
    WHERE i.id = p_inscripcion_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  SELECT rol INTO v_rol FROM usuarios WHERE id = p_usuario_id;
  IF v_insc.alumno_id != p_usuario_id AND v_rol NOT IN ('admin', 'recepcionista') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Calculate next occurrence of this turno
  v_dia_num := CASE v_insc.dia_semana
    WHEN 'lunes' THEN 1 WHEN 'martes' THEN 2 WHEN 'miercoles' THEN 3
    WHEN 'jueves' THEN 4 WHEN 'viernes' THEN 5 WHEN 'sabado' THEN 6 WHEN 'domingo' THEN 0
  END;
  v_hoy_num := EXTRACT(DOW FROM now())::integer;
  v_diff_days := (v_dia_num - v_hoy_num + 7) % 7;
  IF v_diff_days = 0 AND now()::time >= v_insc.hora_inicio THEN
    v_diff_days := 7;
  END IF;
  v_proxima := date_trunc('day', now()) + (v_diff_days || ' days')::interval + v_insc.hora_inicio;

  IF v_proxima - now() >= interval '24 hours' THEN
    UPDATE usuarios SET creditos = creditos + 1 WHERE id = v_insc.alumno_id;
    INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
      VALUES (v_insc.alumno_id, 'devolucion', 1, 'Cancelación inscripción ' || p_inscripcion_id);
    v_devolver := true;
  END IF;

  UPDATE inscripciones SET estado = 'cancelada' WHERE id = p_inscripcion_id;

  -- Promote first from waitlist
  SELECT * INTO v_promovido FROM lista_espera
    WHERE turno_id = v_insc.turno_id
    ORDER BY posicion ASC LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE usuarios SET creditos = creditos - 1 WHERE id = v_promovido.alumno_id;
    INSERT INTO inscripciones (alumno_id, turno_id, estado)
      VALUES (v_promovido.alumno_id, v_insc.turno_id, 'activa');
    INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
      VALUES (v_promovido.alumno_id, 'consumo', 1,
        'Promoción desde lista espera turno ' || v_insc.turno_id);
    DELETE FROM lista_espera WHERE id = v_promovido.id;
    UPDATE lista_espera SET posicion = posicion - 1 WHERE turno_id = v_insc.turno_id;
    INSERT INTO notificaciones (usuario_id, titulo, mensaje)
      VALUES (v_promovido.alumno_id, 'Cupo disponible',
        'Te inscribimos automáticamente al turno que estabas esperando.');
    RETURN jsonb_build_object('credito_devuelto', v_devolver, 'promovido_id', v_promovido.alumno_id);
  END IF;

  RETURN jsonb_build_object('credito_devuelto', v_devolver, 'promovido_id', null);
END;
$$;

-- Ajustar créditos manualmente (admin)
CREATE OR REPLACE FUNCTION ajustar_creditos(
  p_usuario_id  uuid,
  p_cantidad    integer,
  p_descripcion text DEFAULT 'Ajuste manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios SET creditos = creditos + p_cantidad WHERE id = p_usuario_id;
  INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
    VALUES (p_usuario_id, 'ajuste_manual', p_cantidad, p_descripcion);
END;
$$;
