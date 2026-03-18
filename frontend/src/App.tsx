import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Usuarios from "./pages/admin/Usuarios";
import Actividades from "./pages/admin/Actividades";
import Turnos from "./pages/admin/Turnos";
import Planes from "./pages/admin/Planes";
import Notificaciones from "./pages/admin/Notificaciones";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="pacientes" element={<Placeholder title="Pacientes" />} />
              <Route path="agenda" element={<Placeholder title="Agenda" />} />
              <Route path="reportes" element={<Placeholder title="Reportes" />} />

              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="admin/usuarios" element={<Usuarios />} />
                <Route path="admin/actividades" element={<Actividades />} />
                <Route path="admin/turnos" element={<Turnos />} />
                <Route path="admin/planes" element={<Planes />} />
              </Route>

              {/* Notifications - available to all authenticated users */}
              <Route path="notificaciones" element={<Notificaciones />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <p className="mt-2 text-neutral-500">Sección en construcción.</p>
    </div>
  );
}
