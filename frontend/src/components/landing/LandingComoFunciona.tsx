import { PASOS, SECTION_BG } from "./data";

export default function LandingComoFunciona() {
  return (
    <section id="como" className="p-section" style={{ position: "relative", overflow: "hidden" }}>
      <img
        className="pimg"
        data-speed={SECTION_BG.como.speed}
        src={SECTION_BG.como.src}
        alt=""
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        style={{
          position: "absolute",
          top: "-35%",
          left: 0,
          right: 0,
          height: "170%",
          objectFit: "cover",
          willChange: "transform",
          pointerEvents: "none",
          zIndex: 0,
          filter: "brightness(0.12) saturate(0.2)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "rgba(249,115,22,0.9)" }} />

      <div style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
            El sistema
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
            Cómo funciona
          </h2>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {PASOS.map((paso, i) => (
              <div key={paso.n}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-amp-btn)",
                      flexShrink: 0,
                      background: "rgba(0,0,0,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#fff",
                      fontFamily: "var(--font-landing)",
                    }}
                  >
                    {paso.n}
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#fff", fontFamily: "var(--font-landing)" }}>{paso.titulo}</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.72)", marginTop: "4px", lineHeight: 1.55 }}>{paso.desc}</div>
                  </div>
                </div>
                {i < PASOS.length - 1 && <div style={{ width: "1px", height: "26px", background: "rgba(255,255,255,0.25)", margin: "6px 0 6px 20px" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
