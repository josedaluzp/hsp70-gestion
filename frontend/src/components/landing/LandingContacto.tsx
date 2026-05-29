import { SECTION_BG } from "./data";

export default function LandingContacto() {
  const waUrl = "https://wa.me/5492976257545?text=Hola!%20Quiero%20saber%20m%C3%A1s%20sobre%20HSP-70";

  const contactItems = [
    {
      label: "San Martín 1085",
      sub: "Comodoro Rivadavia, Chubut",
      icon: (
        <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "+549 297 6257545",
      sub: "Llamadas y mensajes",
      icon: (
        <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="contacto" className="p-section" style={{ position: "relative", overflow: "hidden" }}>
      <img
        className="pimg"
        data-speed={SECTION_BG.contacto.speed}
        src={SECTION_BG.contacto.src}
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
          filter: "brightness(0.06) saturate(0.2)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "rgba(243,244,243,0.94)" }} />

      <div style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
            Encontranos
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
            Ubicación
          </h2>

          <div style={{ width: "100%", height: "220px", borderRadius: "var(--radius-amp-img)", border: "1px solid var(--color-light-border)", overflow: "hidden", marginBottom: "20px", background: "rgba(255,255,255,0.7)" }}>
            <iframe
              title="HSP-70"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2930.1!2d-67.4956!3d-45.8654!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSan%20Mart%C3%ADn%201085!5e0!3m2!1ses!2sar!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {contactItems.map((it) => (
            <div
              key={it.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(4px)",
                border: "1px solid var(--color-light-border)",
                borderRadius: "var(--radius-amp-card)",
                marginBottom: "10px",
              }}
            >
              <div style={{ width: "40px", height: "40px", borderRadius: "var(--radius-amp-card)", flexShrink: 0, background: "var(--color-light-mist)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-orange-ember)" }}>
                {it.icon}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0a0a0a", fontFamily: "var(--font-landing)" }}>{it.label}</div>
                <div style={{ fontSize: "12px", color: "var(--color-muted-stone)", marginTop: "2px" }}>{it.sub}</div>
              </div>
            </div>
          ))}

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              width: "100%",
              padding: "14px 32px",
              background: "#25d366",
              color: "#fff",
              borderRadius: "var(--radius-amp-btn)",
              fontFamily: "var(--font-landing)",
              fontSize: "14px",
              fontWeight: 600,
              marginTop: "8px",
              textDecoration: "none",
              transition: "opacity 180ms",
            }}
          >
            <svg style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
