import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Button, Spinner } from "../components/ui";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-wide text-neutral-900">HSP-70</h1>
        <p className="mt-2 text-sm text-neutral-500">Iniciá sesión para acceder a tu panel</p>
      </div>
      <Button size="lg" className="w-full max-w-xs cursor-pointer" onClick={login}>
        Iniciar sesión
      </Button>
    </div>
  );
}
