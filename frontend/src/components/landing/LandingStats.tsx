import { STATS } from "./data";

export default function LandingStats() {
  return (
    <div
      className="grid grid-cols-3"
      style={{
        backgroundColor: "var(--color-ash-gray)",
        borderTop: "1px solid var(--color-light-border)",
        borderBottom: "1px solid var(--color-light-border)",
      }}
    >
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className="py-8 px-4 text-center"
          style={{
            borderRight: i < STATS.length - 1 ? "1px solid var(--color-light-border)" : "none",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-landing)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "var(--color-orange-ember)",
            }}
          >
            {s.valor}
          </div>
          <div
            className="text-xs font-medium uppercase mt-2"
            style={{
              fontFamily: "var(--font-landing)",
              color: "var(--color-muted-stone)",
              letterSpacing: "0.12em",
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
