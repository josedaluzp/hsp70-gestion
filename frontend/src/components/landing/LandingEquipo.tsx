import { EQUIPO } from "./data";

export default function LandingEquipo() {
  return (
    <section id="equipo" className="p-section" style={{ position: "relative", overflow: "hidden", backgroundColor: "#111" }}>
      <style>{`
        .team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          max-width: 960px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .team-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      {/* Background: logo HSP-70 centrado, muy sutil */}
      <img
        src="/hsp-70-logo.png"
        alt=""
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(70%, 700px)",
          objectFit: "contain",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.05,
          filter: "grayscale(1) brightness(1.5)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(10,10,10,0.5), rgba(10,10,10,0.35))" }} />

      <div style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
            Quiénes somos
          </p>
          <h2
            style={{
              fontFamily: "var(--font-landing)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "#fff",
              marginBottom: "48px",
              textTransform: "none",
            }}
          >
            El equipo
          </h2>

          <div className="team-grid">
            {EQUIPO.map((m) => (
              <div
                key={m.nombre}
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "var(--radius-amp-card)",
                  overflow: "hidden",
                  transition: "background 200ms, border-color 200ms",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
                  <img
                    src={m.foto}
                    alt={m.nombre}
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", filter: "brightness(0.88)", transition: "filter 280ms" }}
                  />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: "var(--color-orange-ember)" }} />
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", lineHeight: 1.3, fontFamily: "var(--font-landing)" }}>{m.nombre}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>{m.rol}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
