# HSP-70 Gestión

Sistema de gestión integral para el centro de salud y fitness **HSP-70**. Permite administrar alumnos, profesores, actividades, turnos, inscripciones, rutinas de entrenamiento, evaluaciones de salud y planes de membresía.

## Tech Stack

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy (async), SQLite, Pydantic v2 |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4, Recharts |
| **Auth** | JWT (python-jose), bcrypt |
| **Reportes** | openpyxl (Excel), ReportLab (PDF) |
| **Seguridad** | slowapi (rate limiting), security headers, CORS |

## Requisitos previos

- Python >= 3.11
- Node.js >= 20.19 (o >= 22 LTS recomendado)
- npm >= 10

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/josedaluzp/hsp70-gestion.git
cd hsp70-gestion
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y configurar al menos:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `DEBUG` | Modo desarrollo | `true` |
| `SECRET_KEY` | Clave para firmar JWT (**cambiar en producción**) | `change-me-in-production` |
| `DATABASE_URL` | URL de la base de datos | `sqlite+aiosqlite:///./hsp70.db` |
| `CORS_ORIGINS` | Orígenes permitidos (JSON array) | `["http://localhost:5173"]` |
| `RATE_LIMIT_GENERAL` | Rate limit general | `100/15minutes` |
| `RATE_LIMIT_AUTH` | Rate limit para auth | `5/15minutes` |

> **Importante:** En producción, `SECRET_KEY` debe ser un string aleatorio seguro y `DEBUG` debe ser `false`. La aplicación no arranca en producción con el SECRET_KEY por defecto.

### 3. Backend

```bash
pip install -e ".[dev]"
```

O instalar dependencias directamente:

```bash
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic pydantic-settings \
  "python-jose[cryptography]" bcrypt "passlib[bcrypt]" openpyxl reportlab \
  python-multipart email-validator aiosqlite slowapi
```

### 4. Frontend

```bash
cd frontend
npm install
```

## Ejecución

### Iniciar backend

```bash
# Desde la raíz del proyecto
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

El servidor estará disponible en `http://localhost:8000`.

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

### Iniciar frontend

```bash
cd frontend
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Cargar datos de prueba (opcional)

```bash
python -m app.seed
```

Genera datos realistas: 1 admin, 3 profesores, 2 recepcionistas, 15 alumnos, 7 actividades, 3 planes, turnos, inscripciones, asistencias y evaluaciones de salud.

## Estructura del proyecto

```
hsp70-gestion/
├── app/
│   ├── api/               # Endpoints (routers)
│   │   ├── auth.py        # Registro, login, perfil
│   │   ├── usuarios.py    # Gestión de usuarios
│   │   ├── actividades.py # CRUD actividades
│   │   ├── turnos.py      # CRUD turnos
│   │   ├── inscripciones.py # Inscripciones + lista de espera
│   │   ├── asistencias.py # Registro de asistencia
│   │   ├── evaluaciones.py # Evaluaciones de salud
│   │   ├── planes.py      # Planes de membresía
│   │   ├── rutinas.py     # Rutinas de entrenamiento
│   │   ├── ejercicios.py  # Biblioteca de ejercicios
│   │   ├── notificaciones.py
│   │   ├── reportes.py    # Exportación Excel/PDF
│   │   └── stats.py       # Estadísticas del dashboard
│   ├── core/
│   │   ├── config.py      # Configuración (pydantic-settings)
│   │   ├── database.py    # Motor async SQLAlchemy
│   │   ├── security.py    # Hash de contraseñas + JWT
│   │   └── deps.py        # Dependencias de autenticación
│   ├── models/            # Modelos SQLAlchemy
│   ├── schemas/           # Schemas Pydantic
│   ├── services/          # Lógica de negocio
│   ├── tests/             # Tests (pytest + httpx)
│   └── seed.py            # Datos de prueba
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes reutilizables (UI)
│   │   ├── context/       # AuthContext
│   │   ├── hooks/         # Custom hooks
│   │   ├── layouts/       # MainLayout con sidebar
│   │   ├── pages/
│   │   │   ├── admin/     # Dashboard, Usuarios, Actividades, Turnos, Planes, Rutinas
│   │   │   ├── alumno/    # Dashboard, MisClases, Planes, Rutinas, Perfil
│   │   │   └── profesor/  # Dashboard, Turnos, Asistencia, Evaluaciones
│   │   └── services/      # API clients (axios)
│   └── vite.config.ts
├── .env.example
├── pyproject.toml
└── README.md
```

## Roles y permisos

| Rol | Permisos |
|-----|----------|
| **Admin** | Acceso total. Gestiona usuarios, actividades, turnos, planes, rutinas, reportes y estadísticas. |
| **Profesor** | Ve alumnos inscritos en sus turnos. Registra asistencia. Crea evaluaciones de salud y rutinas. |
| **Recepcionista** | Gestiona inscripciones. Ve listados de usuarios. |
| **Alumno** | Ve sus clases, planes, rutinas asignadas y perfil. Se inscribe a turnos. |

## API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar alumno |
| POST | `/api/auth/login` | Iniciar sesión (devuelve JWT) |
| GET | `/api/auth/me` | Perfil del usuario autenticado |

### Recursos principales
| Recurso | Rutas | Operaciones |
|---------|-------|-------------|
| Usuarios | `/api/usuarios` | Listar, ver, actualizar, activar/desactivar |
| Actividades | `/api/actividades` | CRUD completo |
| Turnos | `/api/turnos` | CRUD completo |
| Inscripciones | `/api/inscripciones` | Inscribir, cancelar, listar (con lista de espera) |
| Asistencias | `/api/asistencias` | Registrar, listar, eliminar |
| Evaluaciones | `/api/evaluaciones` | Crear, listar (calcula IMC automáticamente) |
| Planes | `/api/planes` | CRUD completo |
| Rutinas | `/api/rutinas` | CRUD, asignar a alumnos, gestionar ejercicios |
| Ejercicios | `/api/ejercicios` | CRUD completo |
| Notificaciones | `/api/notificaciones` | Listar notificaciones del usuario |
| Reportes | `/api/reportes` | Exportar alumnos, asistencias y morosos (Excel/PDF) |
| Estadísticas | `/api/stats` | Dashboard de estadísticas (admin) |

## Tests

```bash
# Ejecutar todos los tests
python -m pytest

# Con cobertura
python -m pytest --cov=app --cov-report=term-missing

# Linting
ruff check app/
mypy app/
```

Cobertura mínima requerida: **80%**.

## Seguridad

- Contraseñas hasheadas con **bcrypt**
- Autenticación via **JWT** con expiración configurable
- **Rate limiting** en endpoints de auth (5 req/15 min) y general (100 req/15 min)
- **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS (en producción)
- Validación de inputs con **Pydantic** schemas estrictos
- CORS configurable por variable de entorno
- Validación de SECRET_KEY al arrancar (bloquea inicio en producción con clave por defecto)

## Licencia

Proyecto privado. Todos los derechos reservados.
