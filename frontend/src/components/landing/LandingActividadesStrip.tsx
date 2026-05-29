import { STRIP_IMAGES } from "./data";

export default function LandingActividadesStrip() {
  return (
    <div
      id="strip"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "2px",
        height: "260px",
        backgroundColor: "#000",
      }}
    >
      {STRIP_IMAGES.map((card) => (
        <div key={card.num} className="acard" style={{ position: "relative", overflow: "hidden", cursor: "default" }}>
          <img
            className="pimg"
            data-speed={card.speed}
            src={card.src}
            alt={card.name}
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")}
            style={{
              position: "absolute",
              top: "-35%",
              left: 0,
              right: 0,
              height: "170%",
              objectFit: "cover",
              willChange: "transform",
              filter: "brightness(0.35)",
              transition: "filter 320ms ease",
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "var(--color-orange-ember)", fontWeight: 600, letterSpacing: "0.2em", fontFamily: "ui-monospace, monospace" }}>
              {card.num}
            </div>
            <div style={{ fontSize: "12px", color: "#fff", fontWeight: 600, marginTop: "3px", lineHeight: 1.2 }}>{card.name}</div>
            <span
              style={{
                display: "inline-block",
                marginTop: "5px",
                fontSize: "10px",
                color: "rgba(255,255,255,0.5)",
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "2px 8px",
              }}
            >
              {card.dur}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
