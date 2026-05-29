import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import api from "../services/api";
import { Button, Input } from "../components/ui";

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/usuarios/${user.id}`, {
        telefono: telefono || null,
        dni: dni || null,
        fecha_nacimiento: fechaNacimiento || null,
      });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch {
      setError("No se pudieron guardar los datos. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-neutral-900">
          Completá tu perfil
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Estos datos nos ayudan a gestionar tu membresía. Podés editarlos luego.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <Input label="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
        />
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="cursor-pointer">
            {saving ? "Guardando..." : "Guardar y continuar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            Omitir
          </Button>
        </div>
      </form>
    </div>
  );
}
