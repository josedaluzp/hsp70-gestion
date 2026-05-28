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
    return <Navigate to="/dashboard" replace />;
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 60% 20%, rgba(249,115,22,0.08) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(34,197,94,0.05) 0%, transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/30">
            <span className="font-display text-2xl font-black text-white tracking-wide">H</span>
          </div>
          <h1 className="font-display text-4xl font-black tracking-widest text-neutral-50">
            HSP<span className="text-primary-500">-70</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Ingresá a tu cuenta
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-neutral-700/60 bg-neutral-800/80 p-7 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-300">
                Email
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="block w-full rounded-lg border border-neutral-600 bg-neutral-900/60 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-colors duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-300">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="block w-full rounded-lg border border-neutral-600 bg-neutral-900/60 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-colors duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full !py-2.5 !text-base !font-bold tracking-wide shadow-lg shadow-primary-500/20"
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
            className="font-semibold text-primary-400 hover:text-primary-300 transition-colors"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
