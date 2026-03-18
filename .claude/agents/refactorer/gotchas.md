# Refactorer — Gotchas

Non-obvious failure modes and lessons learned. Read these BEFORE starting any refactoring task.

---

### Check for in-progress agents before renaming files
Never rename files that other in-progress agents might be importing — check `.tareas/events/` first for active agent sessions. Renaming a file that another agent is working on will cause their branch to fail on merge.

### Find ALL references before moving code
When moving code between modules, update ALL import paths — use grep to find all references. Missing even one import causes a runtime error that only surfaces when that specific code path is hit.

### SQLAlchemy backref breakage
SQLAlchemy relationship backrefs: renaming a model class breaks backrefs in other files silently. The error only appears at runtime when the relationship is accessed, not at import time. Search for both the class name AND any `backref=` strings referencing it.

### Incremental over big-bang
Prefer incremental refactors over big-bang rewrites — each change should be a separate commit. If something goes wrong mid-refactor, you can revert one commit instead of losing all progress.
