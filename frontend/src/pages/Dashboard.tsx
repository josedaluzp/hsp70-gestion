import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Spinner } from "../components/ui";

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/admin/dashboard",
  profesor: "/profesor/dashboard",
  alumno: "/alumno/dashboard",
  recepcionista: "/admin/dashboard",
};

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const target = user ? ROLE_DASHBOARDS[user.rol] ?? "/login" : "/login";
  return <Navigate to={target} replace />;
}
