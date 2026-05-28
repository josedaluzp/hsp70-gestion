import { EQUIPO } from "./data";

function MemberCard({ nombre, rol, foto }: { nombre: string; rol: string; foto: string }) {
  return (
    <div
      className="flex flex-col overflow-hidden transition-shadow duration-200 cursor-default"
      style={{
        backgroundColor: "var(--color-white-canvas)",
        borderRadius: "var(--radius-amp-card)",
        border: "1px solid var(--color-light-border)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div className="relative overflow-hidden aspect-square" style={{ backgroundColor: "var(--color-light-mist)" }}>
        <img
          src={foto}
          alt={nombre}
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            const fb = t.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
        {/* Fallback */}
        <div className="absolute inset-0 items-center justify-center" style={{ display: "none", backgroundColor: "var(--color-light-mist)" }}>
          <div className="w-14 h-14 rounded-full" style={{ backgroundColor: "var(--color-ash-gray)", border: "2px solid var(--color-light-border)" }} />
        </div>
        {/* Orange accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--color-orange-ember)" }} />
      </div>
      <div className="px-4 py-4">
        <div className="text-sm font-semibold leading-tight" style={{ fontFamily: "var(--font-landing)", color: "var(--color-deep-graphite)" }}>
          {nombre}
        </div>
        <div className="text-xs mt-1" style={{ fontFamily: "var(--font-landing)", color: "var(--color-muted-stone)" }}>
          {rol}
        </div>
      </div>
    </div>
  );
}

export default function LandingEquipo() {
  return (
    <section
      id="equipo"
      className="px-6"
      style={{
        backgroundColor: "var(--color-ash-gray)",
        borderTop: "1px solid var(--color-light-border)",
        paddingTop: "80px",
        paddingBottom: "80px",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-semibold uppercase mb-3" style={{ fontFamily: "var(--font-landing)", color: "var(--color-orange-ember)", letterSpacing: "0.15em" }}>
          Quiénes somos
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
          El equipo
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EQUIPO.map((m) => <MemberCard key={m.nombre} {...m} />)}
        </div>

        <div className="mt-12">
          <p className="text-xs font-medium uppercase mb-4" style={{ fontFamily: "var(--font-landing)", color: "var(--color-muted-stone)", letterSpacing: "0.1em" }}>
            Deportistas que entrenan con nosotros
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-video flex items-center justify-center" style={{ backgroundColor: "var(--color-white-canvas)", borderRadius: "var(--radius-amp-card)", border: "1px solid var(--color-light-border)" }}>
                <span className="text-xs" style={{ color: "var(--color-light-border)", fontFamily: "var(--font-landing)" }}>Foto atleta</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
