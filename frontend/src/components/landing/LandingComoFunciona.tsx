import { PASOS } from "./data";

export default function LandingComoFunciona() {
  return (
    <section
      className="px-6"
      style={{
        backgroundColor: "var(--color-orange-ember)",
        paddingTop: "80px",
        paddingBottom: "80px",
      }}
    >
      <div className="max-w-2xl mx-auto">
        <p
          className="text-xs font-semibold uppercase mb-3"
          style={{ fontFamily: "var(--font-landing)", color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em" }}
        >
          El sistema
        </p>
        <h2
          style={{
            fontFamily: "var(--font-landing)",
            fontSize: "clamp(36px, 6vw, 48px)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#ffffff",
            marginBottom: "48px",
          }}
        >
          Cómo funciona
        </h2>

        <div className="flex flex-col">
          {PASOS.map((paso, i) => (
            <div key={paso.n}>
              <div className="flex items-start gap-5">
                <div
                  className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.15)",
                    borderRadius: "var(--radius-amp-btn)",
                  }}
                >
                  <span className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--font-landing)" }}>
                    {paso.n}
                  </span>
                </div>
                <div>
                  <div className="text-base font-semibold" style={{ fontFamily: "var(--font-landing)", color: "#fff" }}>
                    {paso.titulo}
                  </div>
                  <div className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                    {paso.desc}
                  </div>
                </div>
              </div>
              {i < PASOS.length - 1 && (
                <div className="w-px h-8 ml-5 my-2" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
