import { useState, useCallback, useRef, useEffect } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import SearchInput from "../../components/ui/SearchInput";
import { reportes, usuarios, type User } from "../../services/adminApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getFilenameFromResponse(
  contentDisposition: string | undefined,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
  return match?.[1] ?? fallback;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

// ─── Icons (inline SVG) ─────────────────────────────────────────────────────

function UsersIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CalendarCheckIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function BanknotesIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18v-.008zm-12 0h.008v.008H6v-.008z" />
    </svg>
  );
}

function ExclamationIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function IdentificationIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 6.166a4.5 4.5 0 016.75 0" />
    </svg>
  );
}

function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

// ─── Report card wrapper ────────────────────────────────────────────────────

interface ReportCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function ReportCard({ icon, iconBg, title, description, children }: ReportCardProps) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="mt-0.5 text-sm text-neutral-500 leading-snug">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 pt-4 border-t border-neutral-100">
        {children}
      </div>
    </Card>
  );
}

// ─── Date range filter ──────────────────────────────────────────────────────

interface DateRangeProps {
  fechaInicio: string;
  fechaFin: string;
  onChangeFechaInicio: (v: string) => void;
  onChangeFechaFin: (v: string) => void;
}

function DateRangeFilter({ fechaInicio, fechaFin, onChangeFechaInicio, onChangeFechaFin }: DateRangeProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        type="date"
        label="Desde"
        value={fechaInicio}
        onChange={(e) => onChangeFechaInicio(e.target.value)}
        max={fechaFin || undefined}
      />
      <Input
        type="date"
        label="Hasta"
        value={fechaFin}
        onChange={(e) => onChangeFechaFin(e.target.value)}
        min={fechaInicio || undefined}
      />
    </div>
  );
}

// ─── Student search for PDF ─────────────────────────────────────────────────

interface AlumnoOption {
  id: number;
  nombre: string;
  apellido: string;
  dni: string | null;
}

function AlumnoSearch({
  selectedAlumno,
  onSelect,
}: {
  selectedAlumno: AlumnoOption | null;
  onSelect: (a: AlumnoOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlumnoOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await usuarios.list({ rol: "alumno", search: q, page_size: 8 });
      const items = res.data.items.map((u: User) => ({
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        dni: u.dni,
      }));
      setResults(items);
      setShowDropdown(items.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (selectedAlumno) onSelect(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (a: AlumnoOption) => {
    onSelect(a);
    setQuery(`${a.apellido}, ${a.nombre}${a.dni ? ` — DNI ${a.dni}` : ""}`);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setQuery("");
    onSelect(null);
    setResults([]);
    setShowDropdown(false);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        Buscar alumno
      </label>
      <SearchInput
        placeholder="Nombre, apellido o DNI..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onClear={handleClear}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
      />
      {searching && (
        <div className="absolute right-10 top-[2.35rem] text-neutral-400">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg max-h-56 overflow-y-auto">
          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleSelect(a)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 text-xs font-semibold">
                {a.nombre[0]}{a.apellido[0]}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-neutral-800 truncate">
                  {a.apellido}, {a.nombre}
                </p>
                {a.dni && (
                  <p className="text-xs text-neutral-400">DNI {a.dni}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

type DownloadingKey = "alumnos" | "asistencias" | "pagos" | "morosos" | "ficha";

export default function Reportes() {
  // Date filters
  const [asistFechaInicio, setAsistFechaInicio] = useState(thirtyDaysAgoStr);
  const [asistFechaFin, setAsistFechaFin] = useState(todayStr);
  const [pagosFechaInicio, setPagosFechaInicio] = useState(thirtyDaysAgoStr);
  const [pagosFechaFin, setPagosFechaFin] = useState(todayStr);

  // Student PDF
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoOption | null>(null);

  // Download state
  const [downloading, setDownloading] = useState<Record<DownloadingKey, boolean>>({
    alumnos: false,
    asistencias: false,
    pagos: false,
    morosos: false,
    ficha: false,
  });
  const [error, setError] = useState<string | null>(null);

  const startDownload = async (key: DownloadingKey, fn: () => Promise<void>) => {
    setError(null);
    setDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      await fn();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al generar el reporte";
      setError(msg);
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleAlumnosExcel = () =>
    startDownload("alumnos", async () => {
      const res = await reportes.alumnosExcel();
      const filename = getFilenameFromResponse(
        res.headers["content-disposition"],
        "alumnos.xlsx",
      );
      triggerDownload(res.data, filename);
    });

  const handleAsistenciasExcel = () =>
    startDownload("asistencias", async () => {
      const res = await reportes.asistenciasExcel(asistFechaInicio, asistFechaFin);
      const filename = getFilenameFromResponse(
        res.headers["content-disposition"],
        `asistencias_${asistFechaInicio}_${asistFechaFin}.xlsx`,
      );
      triggerDownload(res.data, filename);
    });

  const handlePagosExcel = () =>
    startDownload("pagos", async () => {
      const res = await reportes.pagosExcel(pagosFechaInicio, pagosFechaFin);
      const filename = getFilenameFromResponse(
        res.headers["content-disposition"],
        `pagos_${pagosFechaInicio}_${pagosFechaFin}.xlsx`,
      );
      triggerDownload(res.data, filename);
    });

  const handleMorososExcel = () =>
    startDownload("morosos", async () => {
      const res = await reportes.morososExcel();
      const filename = getFilenameFromResponse(
        res.headers["content-disposition"],
        "morosos.xlsx",
      );
      triggerDownload(res.data, filename);
    });

  const handleFichaPdf = () => {
    if (!selectedAlumno) return;
    startDownload("ficha", async () => {
      const res = await reportes.alumnoFichaPdf(selectedAlumno.id);
      const filename = getFilenameFromResponse(
        res.headers["content-disposition"],
        `alumno_${selectedAlumno.id}_ficha.pdf`,
      );
      triggerDownload(res.data, filename);
    });
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Reportes
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Genera y descarga reportes en Excel y PDF del sistema.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-danger-500 hover:text-danger-700"
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Report cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Listado de Alumnos */}
        <ReportCard
          icon={<UsersIcon className="h-5 w-5 text-primary-600" />}
          iconBg="bg-primary-50"
          title="Listado de alumnos"
          description="Exporta el listado completo de alumnos registrados con sus datos personales."
        >
          <Button
            variant="primary"
            size="sm"
            loading={downloading.alumnos}
            icon={<DownloadIcon />}
            onClick={handleAlumnosExcel}
          >
            Descargar Excel
          </Button>
        </ReportCard>

        {/* 2. Asistencias */}
        <ReportCard
          icon={<CalendarCheckIcon className="h-5 w-5 text-accent-600" />}
          iconBg="bg-accent-50"
          title="Reporte de asistencias"
          description="Registro de asistencias por actividad y turno en un rango de fechas."
        >
          <DateRangeFilter
            fechaInicio={asistFechaInicio}
            fechaFin={asistFechaFin}
            onChangeFechaInicio={setAsistFechaInicio}
            onChangeFechaFin={setAsistFechaFin}
          />
          <Button
            variant="primary"
            size="sm"
            loading={downloading.asistencias}
            icon={<DownloadIcon />}
            onClick={handleAsistenciasExcel}
            disabled={!asistFechaInicio || !asistFechaFin}
          >
            Descargar Excel
          </Button>
        </ReportCard>

        {/* 3. Pagos */}
        <ReportCard
          icon={<BanknotesIcon className="h-5 w-5 text-success-600" />}
          iconBg="bg-success-50"
          title="Reporte de pagos"
          description="Historial de pagos realizados con detalle de montos, planes y estados."
        >
          <DateRangeFilter
            fechaInicio={pagosFechaInicio}
            fechaFin={pagosFechaFin}
            onChangeFechaInicio={setPagosFechaInicio}
            onChangeFechaFin={setPagosFechaFin}
          />
          <Button
            variant="primary"
            size="sm"
            loading={downloading.pagos}
            icon={<DownloadIcon />}
            onClick={handlePagosExcel}
            disabled={!pagosFechaInicio || !pagosFechaFin}
          >
            Descargar Excel
          </Button>
        </ReportCard>

        {/* 4. Morosos */}
        <ReportCard
          icon={<ExclamationIcon className="h-5 w-5 text-warning-600" />}
          iconBg="bg-warning-50"
          title="Reporte de morosos"
          description="Listado de alumnos con pagos vencidos o pendientes de regularización."
        >
          <Button
            variant="primary"
            size="sm"
            loading={downloading.morosos}
            icon={<DownloadIcon />}
            onClick={handleMorososExcel}
          >
            Descargar Excel
          </Button>
        </ReportCard>

        {/* 5. Ficha de Alumno PDF */}
        <ReportCard
          icon={<IdentificationIcon className="h-5 w-5 text-primary-600" />}
          iconBg="bg-primary-50"
          title="Ficha de alumno"
          description="Genera un PDF con la ficha completa: datos, pagos, asistencias y evaluaciones."
        >
          <AlumnoSearch
            selectedAlumno={selectedAlumno}
            onSelect={setSelectedAlumno}
          />
          <Button
            variant="primary"
            size="sm"
            loading={downloading.ficha}
            icon={<DownloadIcon />}
            onClick={handleFichaPdf}
            disabled={!selectedAlumno}
          >
            Generar PDF
          </Button>
        </ReportCard>
      </div>
    </div>
  );
}
