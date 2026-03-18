import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  Spinner,
  EmptyState,
  Badge,
  Button,
  Input,
  Modal,
  SearchInput,
} from "../../components/ui";
import {
  alumnos as alumnosApi,
  evaluaciones as evaluacionesApi,
} from "../../services/profesorApi";
import type {
  AlumnoBusqueda,
  EvaluacionSalud,
  EvaluacionCreate,
} from "../../services/profesorApi";

function calcIMC(pesoKg: number, alturaCm: number): number | null {
  if (pesoKg <= 0 || alturaCm <= 0) return null;
  const alturaM = alturaCm / 100;
  return Math.round((pesoKg / (alturaM * alturaM)) * 10) / 10;
}

function imcCategoria(imc: number): { label: string; variant: "success" | "warning" | "danger" | "accent" } {
  if (imc < 18.5) return { label: "Bajo peso", variant: "accent" };
  if (imc < 25) return { label: "Normal", variant: "success" };
  if (imc < 30) return { label: "Sobrepeso", variant: "warning" };
  return { label: "Obesidad", variant: "danger" };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const EMPTY_FORM: EvaluacionCreate = {
  alumno_id: 0,
  peso_kg: 0,
  altura_cm: 0,
  grasa_corporal: null,
  objetivo: "",
  notas: "",
};

export default function ProfesorEvaluaciones() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AlumnoBusqueda[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected student
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoBusqueda | null>(null);
  const [evaluacionesList, setEvaluacionesList] = useState<EvaluacionSalud[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(false);

  // New evaluation form
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EvaluacionCreate>({ ...EMPTY_FORM });
  const [savingEval, setSavingEval] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      try {
        const res = await alumnosApi.search(searchQuery.trim());
        setSearchResults(res.data.items);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load evaluations when student is selected
  useEffect(() => {
    if (!selectedAlumno) {
      setEvaluacionesList([]);
      return;
    }

    async function loadEvals() {
      setLoadingEvals(true);
      try {
        const res = await evaluacionesApi.listByAlumno(selectedAlumno!.id);
        setEvaluacionesList(res.data);
      } catch {
        setEvaluacionesList([]);
      } finally {
        setLoadingEvals(false);
      }
    }

    loadEvals();
  }, [selectedAlumno]);

  const selectAlumno = useCallback((alumno: AlumnoBusqueda) => {
    setSelectedAlumno(alumno);
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAlumno(null);
    setEvaluacionesList([]);
  }, []);

  const openNewEval = useCallback(() => {
    if (!selectedAlumno) return;
    setForm({ ...EMPTY_FORM, alumno_id: selectedAlumno.id });
    setFormError(null);
    setShowModal(true);
  }, [selectedAlumno]);

  const previewIMC = useMemo(() => {
    if (!form.peso_kg || !form.altura_cm) return null;
    return calcIMC(form.peso_kg, form.altura_cm);
  }, [form.peso_kg, form.altura_cm]);

  async function handleSubmitEval(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.peso_kg < 20 || form.peso_kg > 300) {
      setFormError("El peso debe estar entre 20 y 300 kg.");
      return;
    }
    if (form.altura_cm < 50 || form.altura_cm > 250) {
      setFormError("La altura debe estar entre 50 y 250 cm.");
      return;
    }
    if (
      form.grasa_corporal !== null &&
      form.grasa_corporal !== undefined &&
      (form.grasa_corporal < 0 || form.grasa_corporal > 100)
    ) {
      setFormError("El porcentaje de grasa corporal debe estar entre 0 y 100.");
      return;
    }

    setSavingEval(true);
    try {
      const payload: EvaluacionCreate = {
        alumno_id: form.alumno_id,
        peso_kg: form.peso_kg,
        altura_cm: form.altura_cm,
        grasa_corporal: form.grasa_corporal || null,
        objetivo: form.objetivo || null,
        notas: form.notas || null,
      };

      await evaluacionesApi.create(payload);

      // Refresh list
      const res = await evaluacionesApi.listByAlumno(form.alumno_id);
      setEvaluacionesList(res.data);
      setShowModal(false);
    } catch {
      setFormError("Error al guardar la evaluación. Intente nuevamente.");
    } finally {
      setSavingEval(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Evaluaciones</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Buscá un alumno para ver su historial o crear una nueva evaluación
        </p>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alumno por nombre, apellido o email..."
          />

          {/* Results dropdown */}
          {(searchResults.length > 0 || (hasSearched && !searching)) && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
              {searching ? (
                <div className="flex items-center justify-center p-4">
                  <Spinner size="sm" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500">
                  No se encontraron alumnos.
                </p>
              ) : (
                searchResults.map((alumno) => (
                  <button
                    key={alumno.id}
                    type="button"
                    onClick={() => selectAlumno(alumno)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 border-b border-neutral-50 last:border-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {alumno.nombre[0]}
                      {alumno.apellido[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {alumno.apellido}, {alumno.nombre}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {alumno.email}
                        {alumno.dni ? ` — DNI ${alumno.dni}` : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Selected student */}
      {selectedAlumno && (
        <div className="space-y-6">
          {/* Student header */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {selectedAlumno.nombre[0]}
                  {selectedAlumno.apellido[0]}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {selectedAlumno.apellido}, {selectedAlumno.nombre}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {selectedAlumno.email}
                    {selectedAlumno.dni ? ` — DNI ${selectedAlumno.dni}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={openNewEval}>Nueva evaluación</Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Cambiar alumno
                </Button>
              </div>
            </div>
          </Card>

          {/* Evaluation history */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              Historial de evaluaciones
            </h3>

            {loadingEvals ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : evaluacionesList.length === 0 ? (
              <Card>
                <EmptyState
                  title="Sin evaluaciones"
                  description="Este alumno no tiene evaluaciones registradas."
                  action={
                    <Button onClick={openNewEval}>Crear primera evaluación</Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {evaluacionesList
                  .sort(
                    (a, b) =>
                      new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
                  )
                  .map((ev) => (
                    <EvalCard key={ev.id} eval={ev} />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No student selected */}
      {!selectedAlumno && !searchQuery && (
        <Card>
          <EmptyState
            icon={<SearchIcon className="h-12 w-12" />}
            title="Buscá un alumno"
            description="Usá el campo de búsqueda para encontrar un alumno y ver sus evaluaciones."
          />
        </Card>
      )}

      {/* New evaluation modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva evaluación"
        description={
          selectedAlumno
            ? `${selectedAlumno.apellido}, ${selectedAlumno.nombre}`
            : ""
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitEval} loading={savingEval}>
              Guardar evaluación
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitEval} className="space-y-5">
          {formError && (
            <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-600">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Peso (kg)"
              type="number"
              step="0.1"
              min="20"
              max="300"
              required
              value={form.peso_kg || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  peso_kg: parseFloat(e.target.value) || 0,
                }))
              }
            />
            <Input
              label="Altura (cm)"
              type="number"
              step="0.1"
              min="50"
              max="250"
              required
              value={form.altura_cm || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  altura_cm: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>

          {/* IMC preview */}
          {previewIMC && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">
                  IMC calculado
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-neutral-900">
                    {previewIMC}
                  </span>
                  <Badge variant={imcCategoria(previewIMC).variant}>
                    {imcCategoria(previewIMC).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Grasa corporal (%)"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.grasa_corporal ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  grasa_corporal: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                }))
              }
              helperText="Opcional"
            />
            <Input
              label="Objetivo"
              value={form.objetivo ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, objetivo: e.target.value }))
              }
              placeholder="Ej: Bajar de peso, tonificar..."
              helperText="Opcional"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Notas
            </label>
            <textarea
              value={form.notas ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, notas: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="Observaciones adicionales..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EvalCard({ eval: ev }: { eval: EvaluacionSalud }) {
  const imc = ev.imc ?? (ev.peso_kg && ev.altura_cm ? calcIMC(ev.peso_kg, ev.altura_cm) : null);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="text-sm text-neutral-500">{formatDate(ev.fecha)}</div>
        {imc && (
          <Badge variant={imcCategoria(imc).variant}>
            IMC {imc} — {imcCategoria(imc).label}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricItem label="Peso" value={ev.peso_kg ? `${ev.peso_kg} kg` : "—"} />
        <MetricItem label="Altura" value={ev.altura_cm ? `${ev.altura_cm} cm` : "—"} />
        <MetricItem label="IMC" value={imc ? String(imc) : "—"} />
        <MetricItem
          label="Grasa corporal"
          value={ev.grasa_corporal != null ? `${ev.grasa_corporal}%` : "—"}
        />
      </div>

      {ev.objetivo && (
        <div className="mt-4 pt-3 border-t border-neutral-100">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Objetivo
          </p>
          <p className="mt-1 text-sm text-neutral-700">{ev.objetivo}</p>
        </div>
      )}

      {ev.notas && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Notas
          </p>
          <p className="mt-1 text-sm text-neutral-700">{ev.notas}</p>
        </div>
      )}
    </Card>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}
