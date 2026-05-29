import { Link } from "react-router-dom";
import { PLANES } from "./data";

export default function LandingPlanes() {
  return (
    <section
      id="planes"
      style={{
        position: "relative",
        backgroundColor: "var(--color-white-canvas)",
        padding: "100px 48px",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
          Flexibilidad total
        </p>
        <h2
          style={{
            fontFamily: "var(--font-landing)",
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--color-dark-charcoal)",
            marginBottom: "48px",
            textTransform: "none",
          }}
        >
          Packs de créditos
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {PLANES.map((plan) => {
            const featured = plan.badge !== null;
            return (
              <div
                key={plan.nombre}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: featured ? "var(--color-soft-peach)" : "var(--color-white-canvas)",
                  borderRadius: "var(--radius-amp-card)",
                  border: `1px solid ${featured ? "var(--color-orange-ember)" : "var(--color-light-border)"}`,
                  padding: "28px 16px 20px",
                  transition: "box-shadow 200ms",
                }}
                onMouseEnter={(e) => {
                  if (!featured) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!featured) e.currentTarget.style.boxShadow = "none";
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "4px 14px",
                      color: "#fff",
                      backgroundColor: "var(--color-orange-ember)",
                      borderRadius: "12px",
                      fontFamily: "var(--font-landing)",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: featured ? "var(--color-orange-ember)" : "var(--color-muted-stone)",
                    marginBottom: "12px",
                    marginTop: featured ? "12px" : 0,
                    fontFamily: "var(--font-landing)",
                  }}
                >
                  {plan.nombre}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-landing)",
                    fontSize: "48px",
                    fontWeight: 300,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    color: "var(--color-deep-graphite)",
                  }}
                >
                  {plan.creditos}
                </div>
                <div style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted-stone)", marginTop: "4px", marginBottom: "24px", fontFamily: "var(--font-landing)" }}>
                  créditos
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px", flex: 1, listStyle: "none", padding: 0 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ fontSize: "12px", color: "var(--color-muted-stone)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "var(--color-orange-ember)" }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  style={
                    featured
                      ? {
                          backgroundColor: "var(--color-orange-ember)",
                          color: "#fff",
                          borderRadius: "var(--radius-amp-btn)",
                          padding: "12px",
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                          boxShadow: "var(--shadow-amp-cta)",
                          fontFamily: "var(--font-landing)",
                          transition: "opacity 180ms",
                        }
                      : {
                          backgroundColor: "var(--color-light-mist)",
                          color: "var(--color-dark-charcoal)",
                          borderRadius: "var(--radius-amp-btn)",
                          padding: "12px",
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                          fontFamily: "var(--font-landing)",
                          transition: "opacity 180ms",
                        }
                  }
                >
                  Empezar
                </Link>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "12px", color: "var(--color-muted-stone)", textAlign: "center", marginTop: "20px", fontFamily: "var(--font-landing)" }}>
          Precios a confirmar · 1 crédito = 1 clase en cualquier actividad
        </p>
      </div>
    </section>
  );
}
