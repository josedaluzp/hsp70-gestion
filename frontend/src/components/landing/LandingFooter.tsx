export default function LandingFooter() {
  const links = [
    { label: "Instagram", href: "https://www.instagram.com/saludcienciahsp70" },
    { label: "Facebook",  href: "https://www.facebook.com/saludcienciahsp70" },
    { label: "WhatsApp",  href: "https://wa.me/5492976257545" },
  ];

  return (
    <footer
      style={{
        background: "var(--color-true-black)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "56px 48px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "18px",
        fontFamily: "var(--font-landing)",
      }}
    >
      <img src="/hsp-70-logo.png" alt="HSP-70" style={{ height: "40px", opacity: 0.55 }} />
      <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
        Salud &amp; Ciencia · Comodoro Rivadavia
      </p>
      <div style={{ display: "flex", gap: "32px" }}>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", textDecoration: "none", transition: "color 180ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-orange-ember)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            {l.label}
          </a>
        ))}
      </div>
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.12)" }}>
        © {new Date().getFullYear()} HSP-70 · Todos los derechos reservados
      </p>
    </footer>
  );
}
