import { ACTIVIDADES } from "./data";

export default function LandingActividades() {
  return (
    <section
      id="actividades"
      className="px-6"
      style={{
        backgroundColor: "var(--color-ash-gray)",
        paddingTop: "80px",
        paddingBottom: "80px",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <p
          className="text-xs font-semibold uppercase mb-3"
          style={{ fontFamily: "var(--font-landing)", color: "var(--color-orange-ember)", letterSpacing: "0.15em" }}
        >
          Lo que hacemos
        </p>
        <h2
          style={{
            fontFamily: "var(--font-landing)",
            fontSize: "clamp(36px, 6vw, 48px)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--color-dark-charcoal)",
            marginBottom: "48px",
          }}
        >
          Actividades
        </h2>

        <div className="flex flex-col gap-3">
          {ACTIVIDADES.map((a) => (
            <div
              key={a.num}
              className="flex items-center gap-5 cursor-default transition-shadow duration-200"
              style={{
                backgroundColor: "var(--color-white-canvas)",
                borderRadius: "var(--radius-amp-card)",
                border: "1px solid var(--color-ash-gray)",
                padding: "20px 16px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <span
                className="text-sm font-medium w-8 flex-shrink-0"
                style={{ fontFamily: "ui-monospace, monospace", color: "var(--color-orange-ember)" }}
              >
                {a.num}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-landing)", color: "var(--color-deep-graphite)" }}>
                  {a.nombre}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--color-muted-stone)" }}>
                  {a.desc}
                </div>
              </div>
              <span
                className="text-xs font-medium flex-shrink-0 px-3 py-1"
                style={{
                  color: "var(--color-muted-stone)",
                  backgroundColor: "var(--color-light-mist)",
                  borderRadius: "12px",
                  fontFamily: "var(--font-landing)",
                }}
              >
                {a.duracion}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
