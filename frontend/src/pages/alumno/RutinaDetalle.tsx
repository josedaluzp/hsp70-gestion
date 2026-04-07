import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Card, Spinner, Modal } from "../../components/ui";
import { rutinasAlumnoApi } from "../../services/rutinaApi";
import type { RutinaDetail, RutinaEjercicio } from "../../services/rutinaApi";

function extractYouTubeId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  return null;
}

export default function AlumnoRutinaDetalle() {
  const { user } = useAuth();
  const { rutinaId } = useParams<{ rutinaId: string }>();

  const [rutina, setRutina] = useState<RutinaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [videoEjercicio, setVideoEjercicio] = useState<RutinaEjercicio | null>(null);

  useEffect(() => {
    if (!user || !rutinaId) return;
    fetchRutina();
  }, [user, rutinaId]);

  async function fetchRutina() {
    setLoading(true);
    setError(null);
    try {
      const res = await rutinasAlumnoApi.get(user!.id, Number(rutinaId));
      setRutina(res.data);
    } catch {
      setError("No se pudo cargar la rutina.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-600">
        {error}
      </div>
    );
  }

  if (!rutina) return null;

  const videoId = videoEjercicio
    ? extractYouTubeId(videoEjercicio.ejercicio.video_url)
    : null;

  return (
    <div className="space-y-8">
      {/* Back navigation */}
      <Link
        to="/alumno/rutinas"
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Volver a mis rutinas
      </Link>

      {/* Routine header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-7 sm:px-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {rutina.nombre}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white">
            <ClipboardIcon className="h-4 w-4" />
            {rutina.ejercicios.length}{" "}
            {rutina.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
          </span>
          {rutina.profesor_nombre && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white">
              <UserIcon className="h-4 w-4" />
              Prof. {rutina.profesor_nombre}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {rutina.descripcion && (
        <Card>
          <p className="text-sm leading-relaxed text-neutral-700">{rutina.descripcion}</p>
        </Card>
      )}

      {/* Exercise list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Ejercicios
        </h2>

        {rutina.ejercicios.length === 0 ? (
          <Card className="border-dashed">
            <div className="flex flex-col items-center py-10 text-center">
              <DumbbellIcon className="mb-3 h-12 w-12 text-neutral-300" />
              <p className="font-medium text-neutral-700">Sin ejercicios todavía</p>
              <p className="mt-1 text-sm text-neutral-500">
                Tu profesor aún no asignó ejercicios a esta rutina.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {rutina.ejercicios
              .sort((a, b) => a.orden - b.orden)
              .map((re) => (
                <ExerciseCard
                  key={re.id}
                  ejercicio={re}
                  onPlayVideo={() => setVideoEjercicio(re)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Video modal */}
      <Modal
        open={!!videoEjercicio}
        onClose={() => setVideoEjercicio(null)}
        title={videoEjercicio?.ejercicio.nombre ?? ""}
        size="lg"
      >
        {videoId ? (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full rounded-lg"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={videoEjercicio?.ejercicio.nombre}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
            No se pudo cargar el video. La URL no es válida.
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ExerciseCard({
  ejercicio,
  onPlayVideo,
}: {
  ejercicio: RutinaEjercicio;
  onPlayVideo: () => void;
}) {
  const hasVideo = !!ejercicio.ejercicio.video_url;

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Order number */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
          {ejercicio.orden}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-neutral-900">
            {ejercicio.ejercicio.nombre}
          </h3>

          {/* Video button */}
          {hasVideo && (
            <button
              type="button"
              onClick={onPlayVideo}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-all duration-200 hover:bg-primary-100 cursor-pointer"
            >
              <PlayIcon className="h-4 w-4" />
              Ver video del ejercicio
            </button>
          )}
        </div>

        {/* Mobile play button */}
        {hasVideo && (
          <button
            type="button"
            onClick={onPlayVideo}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-all duration-200 hover:bg-primary-600 cursor-pointer sm:hidden"
            aria-label={`Ver video de ${ejercicio.ejercicio.nombre}`}
          >
            <PlayIcon className="h-4 w-4 ml-0.5" />
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5h10.5M6.75 16.5h10.5M3.75 10.5h1.5v3h-1.5v-3Zm0 0a1.5 1.5 0 0 1 1.5-1.5h0a1.5 1.5 0 0 1 1.5 1.5M3.75 13.5a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5m10.5-3h1.5v3h-1.5v-3Zm0 0a1.5 1.5 0 0 1 1.5-1.5h0a1.5 1.5 0 0 1 1.5 1.5m-1.5 3a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5M12 7.5v9" />
    </svg>
  );
}
