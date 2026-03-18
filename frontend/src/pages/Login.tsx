import { type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Button, Input } from "../components/ui";
import axios from "axios";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Completá todos los campos.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setError("Email o contraseña incorrectos.");
        } else if (status === 403) {
          setError("Tu cuenta está desactivada. Contactá al administrador.");
        } else {
          setError("Error del servidor. Intentá de nuevo más tarde.");
        }
      } else {
        setError("No se pudo conectar al servidor.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500">
            <span className="text-xl font-bold text-white">H</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            HSP-70
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ingresá a tu cuenta
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Iniciar sesión
            </Button>
          </form>
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          ¿No tenés cuenta?{" "}
          <Link
            to="/register"
            className="font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
