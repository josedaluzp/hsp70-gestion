# Test Engineer — Gotchas

Non-obvious failure modes and lessons learned. Read these BEFORE starting any testing task.

---

### Never use the tareas database for tests
Tests must use a SEPARATE SQLite database (`:memory:` or `test.db`), never `.tareas/tareas.db`. That database belongs to the orchestration system and corrupting it will break the coordinator.

### SQLAlchemy fixture scope and parallelism
`pytest` fixtures with `scope="session"` and SQLAlchemy cause issues with parallel tests — connections leak and state bleeds between tests. Use `scope="function"` for database fixtures unless you have a specific reason not to.

### FastAPI test client
When testing FastAPI endpoints, use `TestClient` from `starlette.testclient`, not `httpx` directly. `TestClient` handles the ASGI lifecycle correctly; raw `httpx` misses startup/shutdown events and dependency overrides.

### Async test configuration
Async tests need `pytest-asyncio` with `mode="auto"` in `pyproject.toml`. Without this, async test functions silently pass without actually running.

### Coverage paths in worktrees
Coverage reports in worktrees: set `--rootdir` explicitly or paths won't match. Coverage will report 0% on files that exist because the path prefix differs from what was collected.
