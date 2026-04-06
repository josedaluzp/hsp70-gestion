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
import Reportes from "./pages/admin/Reportes";
import AdminDashboard from "./pages/admin/Dashboard";
import ProfesorDashboard from "./pages/profesor/Dashboard";
import ProfesorTurnos from "./pages/profesor/Turnos";
import ProfesorAsistencia from "./pages/profesor/Asistencia";
import ProfesorEvaluaciones from "./pages/profesor/Evaluaciones";
import AlumnoDashboard from "./pages/alumno/Dashboard";
import AlumnoMisClases from "./pages/alumno/MisClases";
import AlumnoPagos from "./pages/alumno/Pagos";
import AlumnoPerfil from "./pages/alumno/Perfil";
import AlumnoRutinas from "./pages/alumno/Rutinas";
import AlumnoRutinaDetalle from "./pages/alumno/RutinaDetalle";
import AdminEjercicios from "./pages/admin/Ejercicios";
import AdminRutinas from "./pages/admin/Rutinas";

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
              <Route path="reportes" element={<Reportes />} />

              {/* Alumno routes */}
              <Route element={<ProtectedRoute allowedRoles={["alumno"]} />}>
                <Route path="alumno/dashboard" element={<AlumnoDashboard />} />
                <Route path="alumno/clases" element={<AlumnoMisClases />} />
                <Route path="alumno/pagos" element={<AlumnoPagos />} />
                <Route path="alumno/perfil" element={<AlumnoPerfil />} />
                <Route path="alumno/rutinas" element={<AlumnoRutinas />} />
                <Route path="alumno/rutinas/:rutinaId" element={<AlumnoRutinaDetalle />} />
              </Route>

              {/* Profesor routes */}
              <Route element={<ProtectedRoute allowedRoles={["profesor"]} />}>
                <Route path="profesor/dashboard" element={<ProfesorDashboard />} />
                <Route path="profesor/turnos" element={<ProfesorTurnos />} />
                <Route path="profesor/asistencia" element={<ProfesorAsistencia />} />
                <Route path="profesor/evaluaciones" element={<ProfesorEvaluaciones />} />
                <Route path="profesor/ejercicios" element={<AdminEjercicios />} />
                <Route path="profesor/rutinas" element={<AdminRutinas />} />
              </Route>

              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="admin/dashboard" element={<AdminDashboard />} />
                <Route path="admin/usuarios" element={<Usuarios />} />
                <Route path="admin/actividades" element={<Actividades />} />
                <Route path="admin/turnos" element={<Turnos />} />
                <Route path="admin/planes" element={<Planes />} />
                <Route path="admin/ejercicios" element={<AdminEjercicios />} />
                <Route path="admin/rutinas" element={<AdminRutinas />} />
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
