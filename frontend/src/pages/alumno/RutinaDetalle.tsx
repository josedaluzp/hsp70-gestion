import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Spinner, Modal } from "../../components/ui";
import { rutinasAlumnoApi } from "../../services/rutinaApi";
import type { RutinaDetail, RutinaEjercicio } from "../../services/rutinaApi";

function extractYouTubeId(url: string): string | null {
  // Handle youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/embed/ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // Handle youtube.com/watch?v=ID
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

  // Video modal
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
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/alumno/rutinas"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Volver
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {rutina.nombre}
          </h1>
          <p className="text-sm text-neutral-500">
            {rutina.ejercicios.length}{" "}
            {rutina.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
            {rutina.profesor_nombre && ` · Prof. ${rutina.profesor_nombre}`}
          </p>
        </div>
      </div>

      {/* Description */}
      {rutina.descripcion && (
        <p className="text-sm text-neutral-600">{rutina.descripcion}</p>
      )}

      {/* Exercise list */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm divide-y divide-neutral-100">
        {rutina.ejercicios.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-500">
            Esta rutina no tiene ejercicios asignados.
          </div>
        ) : (
          rutina.ejercicios
            .sort((a, b) => a.orden - b.orden)
            .map((re) => (
              <div
                key={re.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-400">
                  {re.orden}
                </span>
                <span className="flex-1 font-semibold text-neutral-900">
                  {re.ejercicio.nombre}
                </span>
                <button
                  type="button"
                  onClick={() => setVideoEjercicio(re)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white transition-colors hover:bg-indigo-600"
                  title="Ver video"
                >
                  <svg
                    className="h-4 w-4 ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            ))
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
            No se pudo cargar el video. URL no valida.
          </div>
        )}
      </Modal>
    </div>
  );
}
