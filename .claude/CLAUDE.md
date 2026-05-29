# hsp70-gestion

> **Fuente de verdad de arquitectura:** consultar `ARCHITECTURE.md` (raíz) antes
> de implementar cualquier feature. Estado y roadmap en `docs/PLAN.md`.

## Overview

# HSP-70 GESTIÓN — Plan del Proyecto

## Requisito de diseño frontend
El frontend debe tener un diseño profesional, estético y minimalista. No usar templates genéricos ni UI de aspecto "AI-generated". Buscar un look limpio, moderno, con buena tipografía, espaciado generoso y paleta de colores coherente con un centro de salud/fitness premium.


## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **API:** Funciones serverless en Vercel (catch-all `frontend/api/[...path].ts`)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (migración a Auth0 planificada)

## Conventions

- Code must be clear and self-documenting
- Functions do one thing, max ~40 lines
- Handle errors explicitly, never silence exceptions
- Use early returns to reduce nesting
- Every feature or bugfix must include tests
- Tests must be independent and deterministic
- Minimum 80% coverage on new code
- Commits in imperative mood, max 72 chars in subject
- Never commit secrets, credentials, or .env files

## Agent Orchestration

This project is managed by an autonomous agent system.
- Tasks are tracked in `.tareas/tareas.db`
- Each agent works on its own branch: `task/<id>-<slug>`
- Cross-agent changes go in `.tareas/events/`
- The coordinator handles merge to `develop`

## Guardrails

- Never modify: `.env`, `.env.*`, `*.lock`, `.tareas/tareas.db`
- Always read a file before editing it
- Prefer editing over rewriting entire files
