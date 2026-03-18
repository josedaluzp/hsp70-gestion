# Debugger — Gotchas

Non-obvious failure modes and lessons learned. Read these BEFORE starting any debugging task.

---

### Windows asyncio event loop limitations
On Windows, `asyncio.ProactorEventLoop` doesn't support `subprocess.PIPE` the same as Unix. Always test async subprocess code on the target OS. Symptoms: hangs, deadlocks, or "NotImplementedError" on pipe operations.

### UnicodeEncodeError on Windows
Always specify `encoding="utf-8"` when writing files that may contain emoji or unicode from Claude output. The default Windows encoding (cp1252) silently corrupts or crashes on non-ASCII characters.

### SQLAlchemy detached instance errors
"Instance is not bound to a Session" happens when accessing lazy-loaded attributes after `session.close()`. Use `joinedload()` in the query or call `session.refresh(obj)` before closing. This error often surfaces far from where the session was closed.

### Git worktree branch lock
`git checkout` inside the main repo fails if the branch is checked out in a worktree. You must remove the worktree first with `git worktree remove`. The error message ("fatal: 'branch' is already checked out") is clear but the fix isn't obvious if you don't know worktrees are in play.

### Read the FULL traceback
When debugging test failures, read the FULL error traceback before proposing a fix — the root cause is usually NOT in the line that throws. Python tracebacks show the call chain bottom-up; the actual bug is often in a caller or in setup code, not the final frame.
