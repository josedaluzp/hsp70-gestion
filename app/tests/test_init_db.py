import pytest


def test_init_db_imports_all_models():
    """Verify init_db.py imports every model so create_all sees them."""
    import app.init_db as mod

    source = open(mod.__file__).read()
    for name in [
        "Actividad", "Asistencia", "Ejercicio", "EvaluacionSalud",
        "Inscripcion", "ListaEspera", "Notificacion", "Pago", "Plan",
        "Rutina", "RutinaAsignacion", "RutinaEjercicio", "Turno", "Usuario",
    ]:
        assert name in source, f"init_db.py is missing import for {name}"
