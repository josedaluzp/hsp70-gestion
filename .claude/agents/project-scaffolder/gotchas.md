# Project Scaffolder — Gotchas

Non-obvious failure modes and lessons learned. Read these BEFORE starting any scaffolding task.

---

### Windows path length limit in worktrees
On Windows, `npm install` can fail silently in git worktrees if the path is too long. Use short directory names for worktrees and project subdirectories.

### Worktrees don't inherit .gitignore
`git worktree add` doesn't copy `.gitignore` patterns to the worktree — files created there may show in `git status` of the main repo. Always verify `.gitignore` is present in the worktree after creation.

### Monorepo root ownership conflicts
When scaffolding both backend and frontend in the same repo, always use separate subdirectories (`app/` and `frontend/`), never put files at the root. Both `vite` and `pyproject.toml` want to own the root — keep them in their respective subdirectories.

### Install dependencies in the worktree, not the main repo
Always run `npm install` / `pip install -e .` INSIDE the worktree, not the main repo. Installing in the wrong location causes phantom module-not-found errors that are hard to trace.

### vite and pyproject.toml root collision
`vite` and `pyproject.toml` both want to own the project root. If you scaffold a fullstack project, keep each tool in its own subdirectory to avoid config conflicts.
