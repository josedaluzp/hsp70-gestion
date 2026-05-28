import { Link } from "react-router-dom";
import { PLANES } from "./data";

export default function LandingPlanes() {
  return (
    <section
      id="planes"
      className="px-6"
      style={{
        backgroundColor: "var(--color-white-canvas)",
        paddingTop: "80px",
        paddingBottom: "80px",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <p
          className="text-xs font-semibold uppercase mb-3"
          style={{ fontFamily: "var(--font-landing)", color: "var(--color-orange-ember)", letterSpacing: "0.15em" }}
        >
          Flexibilidad total
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
          Packs de créditos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANES.map((plan) => {
            const featured = plan.badge !== null;
            return (
              <div
                key={plan.nombre}
                className="relative flex flex-col transition-shadow duration-200"
                style={{
                  backgroundColor: featured ? "var(--color-soft-peach)" : "var(--color-white-canvas)",
                  borderRadius: "var(--radius-amp-card)",
                  border: `1px solid ${featured ? "var(--color-orange-ember)" : "var(--color-light-border)"}`,
                  padding: "28px 16px 20px",
                }}
                onMouseEnter={(e) => !featured && (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)")}
                onMouseLeave={(e) => !featured && (e.currentTarget.style.boxShadow = "none")}
              >
                {plan.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 text-white whitespace-nowrap"
                    style={{ backgroundColor: "var(--color-orange-ember)", borderRadius: "12px", fontFamily: "var(--font-landing)", letterSpacing: "0.05em" }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div
                  className="text-xs font-semibold uppercase mb-3"
                  style={{
                    fontFamily: "var(--font-landing)",
                    color: featured ? "var(--color-orange-ember)" : "var(--color-muted-stone)",
                    letterSpacing: "0.1em",
                    marginTop: featured ? "12px" : "0",
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
                <div
                  className="text-xs font-medium uppercase mt-1 mb-6"
                  style={{ fontFamily: "var(--font-landing)", color: "var(--color-muted-stone)", letterSpacing: "0.1em" }}
                >
                  créditos
                </div>

                <ul className="flex flex-col gap-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs flex items-center gap-2" style={{ color: "var(--color-muted-stone)" }}>
                      <span style={{ color: "var(--color-orange-ember)" }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className="cursor-pointer text-sm font-semibold text-center py-3 transition-opacity duration-200 hover:opacity-90"
                  style={
                    featured
                      ? { backgroundColor: "var(--color-orange-ember)", color: "#ffffff", borderRadius: "var(--radius-amp-btn)", boxShadow: "var(--shadow-amp-cta)", fontFamily: "var(--font-landing)" }
                      : { backgroundColor: "var(--color-light-mist)", color: "var(--color-dark-charcoal)", borderRadius: "var(--radius-amp-btn)", fontFamily: "var(--font-landing)" }
                  }
                >
                  Empezar
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: "var(--color-muted-stone)", fontFamily: "var(--font-landing)" }}>
          Precios a confirmar · 1 crédito = 1 clase en cualquier actividad
        </p>
      </div>
    </section>
  );
}
