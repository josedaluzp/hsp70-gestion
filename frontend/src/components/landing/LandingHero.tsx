export default function LandingHero() {
  const handleScroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden bg-black">
      {/* Video background — reemplazar src con video Higgsfield cuando esté disponible */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/hero-poster.jpg"
      >
        <source src="/images/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(249,115,22,0.04) 0px, rgba(249,115,22,0.04) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(0deg, rgba(249,115,22,0.025) 0px, rgba(249,115,22,0.025) 1px, transparent 1px, transparent 64px)",
        }}
      />

      {/* Glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "40%", left: "50%", transform: "translate(-50%, -50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 65%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6">
        <p className="text-xs font-black tracking-[0.5em] text-orange-500 uppercase mb-6">
          HSP-70 · Comodoro Rivadavia · Chubut
        </p>

        <h1 className="font-black uppercase leading-none mb-4">
          <span
            className="block text-6xl sm:text-8xl lg:text-9xl tracking-tight"
            style={{ color: "transparent", WebkitTextStroke: "1.5px rgba(249,115,22,0.5)" }}
          >
            SALUD
          </span>
          <span className="block text-6xl sm:text-8xl lg:text-9xl tracking-tight text-orange-500">
            &amp;
          </span>
          <span className="block text-6xl sm:text-8xl lg:text-9xl tracking-tight text-white">
            CIENCIA
          </span>
        </h1>

        <p className="text-xs font-bold tracking-[0.3em] text-neutral-500 uppercase mt-6 mb-8">
          Centro Fitness · Rendimiento Físico
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => handleScroll("actividades")}
            className="bg-orange-500 text-black px-8 py-4 text-sm font-black tracking-widest uppercase hover:bg-orange-400 transition-colors cursor-pointer"
          >
            VER ACTIVIDADES ↓
          </button>
          <button
            onClick={() => handleScroll("planes")}
            className="border border-neutral-700 text-neutral-400 px-8 py-4 text-sm font-bold tracking-widest uppercase hover:border-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            NUESTROS PLANES
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2">
          <div className="w-px h-8 bg-orange-500/30 animate-pulse" />
          <span className="text-[10px] tracking-[0.4em] text-neutral-700 uppercase">scroll</span>
        </div>
      </div>
    </section>
  );
}
