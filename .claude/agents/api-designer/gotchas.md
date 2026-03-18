# API Designer — Gotchas

Non-obvious failure modes and lessons learned. Read these BEFORE starting any API design task.

---

### Don't touch the tareas database
SQLAlchemy models in worktrees: the `.tareas/tareas.db` path is relative — agents must NOT import or modify it. This is the orchestration system's database, not the project's.

### Pydantic v2 config syntax
Pydantic v2 uses `model_config = ConfigDict(from_attributes=True)` not `class Config: orm_mode = True` (v1 pattern). Using the v1 pattern will fail silently or raise deprecation errors.

### FastAPI dependency injection for DB sessions
Use `Depends(get_db)` with a generator function, not a global session. A global session causes thread-safety issues and stale data under concurrent requests.

### Cross-branch model dependencies
When creating endpoints that depend on models from another task's branch, design against the SCHEMA (Pydantic model), not the ORM model directly. The ORM model may not exist in your branch yet.

### Mercado Pago SDK package name
Use the `mercadopago` package, not `mercadopago-sdk`. The SDK changed package names and the old one is abandoned.

### JWT library choice
Use `python-jose[cryptography]`, not `PyJWT` — this is consistent with the plan's stack and provides better algorithm support.
