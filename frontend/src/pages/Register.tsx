import { type FormEvent, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import type { RegisterData } from "../context/authTypes";
import { Button, Input } from "../components/ui";

interface FormErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  telefono?: string;
  dni?: string;
  fecha_nacimiento?: string;
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmPassword: "",
    telefono: "",
    dni: "",
    fecha_nacimiento: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const next: FormErrors = {};

    if (!form.nombre.trim()) next.nombre = "El nombre es obligatorio.";
    if (!form.apellido.trim()) next.apellido = "El apellido es obligatorio.";
    if (!form.email.trim()) {
      next.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Email inválido.";
    }
    if (!form.password) {
      next.password = "La contraseña es obligatoria.";
    } else if (form.password.length < 8) {
      next.password = "Mínimo 8 caracteres.";
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Las contraseñas no coinciden.";
    }
    if (form.dni && !/^\d{7,8}$/.test(form.dni.replace(/[.-]/g, ""))) {
      next.dni = "DNI debe tener 7 u 8 dígitos.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    const data: RegisterData = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      password: form.password,
    };
    if (form.telefono.trim()) data.telefono = form.telefono.trim();
    if (form.dni.trim()) data.dni = form.dni.replace(/[.-]/g, "").trim();
    if (form.fecha_nacimiento) data.fecha_nacimiento = form.fecha_nacimiento;

    setLoading(true);
    try {
      await register(data);
      navigate("/login", {
        state: { registered: true },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("ya está registrado") || msg.includes("already registered")) {
        setServerError("Ese email ya está registrado.");
      } else if (msg.includes("DNI")) {
        setServerError("Ese DNI ya está registrado.");
      } else if (msg) {
        setServerError(msg);
      } else {
        setServerError("Error del servidor. Intentá de nuevo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500">
            <span className="text-xl font-bold text-white">H</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Crear cuenta
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Completá tus datos para registrarte
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Juan"
                value={form.nombre}
                onChange={(e) => updateField("nombre", e.target.value)}
                error={errors.nombre}
                autoFocus
              />
              <Input
                label="Apellido"
                placeholder="Pérez"
                value={form.apellido}
                onChange={(e) => updateField("apellido", e.target.value)}
                error={errors.apellido}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            {/* Password row */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Contraseña"
                type="password"
                placeholder="Mín. 8 caracteres"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                error={errors.password}
                autoComplete="new-password"
              />
              <Input
                label="Confirmar"
                type="password"
                placeholder="Repetí la contraseña"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
            </div>

            <Input
              label="Teléfono"
              type="tel"
              placeholder="+54 11 1234-5678"
              value={form.telefono}
              onChange={(e) => updateField("telefono", e.target.value)}
              error={errors.telefono}
            />

            {/* DNI + Birth date row */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="DNI"
                placeholder="12345678"
                value={form.dni}
                onChange={(e) => updateField("dni", e.target.value)}
                error={errors.dni}
              />
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
                error={errors.fecha_nacimiento}
              />
            </div>

            {serverError && (
              <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Crear cuenta
            </Button>
          </form>
        </div>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          ¿Ya tenés cuenta?{" "}
          <Link
            to="/login"
            className="font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
