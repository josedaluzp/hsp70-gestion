import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pacientes" element={<Placeholder title="Pacientes" />} />
          <Route path="agenda" element={<Placeholder title="Agenda" />} />
          <Route path="reportes" element={<Placeholder title="Reportes" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
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
