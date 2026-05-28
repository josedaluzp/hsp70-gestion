export default function LandingFooter() {
  const links = [
    { label: "Instagram", href: "https://www.instagram.com/saludcienciahsp70" },
    { label: "Facebook", href: "https://www.facebook.com/saludcienciahsp70" },
    { label: "WhatsApp", href: "https://wa.me/5492976257545" },
  ];

  return (
    <footer
      className="px-6 flex flex-col items-center gap-6"
      style={{
        backgroundColor: "var(--color-true-black)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: "56px",
        paddingBottom: "56px",
      }}
    >
      <img
        src="/hsp-70-logo.png"
        alt="HSP-70"
        className="h-10 w-auto"
        style={{ opacity: 0.55 }}
      />

      <p
        className="text-xs font-medium uppercase"
        style={{
          fontFamily: "var(--font-landing)",
          color: "rgba(255,255,255,0.22)",
          letterSpacing: "0.2em",
        }}
      >
        Salud &amp; Ciencia · Comodoro Rivadavia
      </p>

      <div className="flex gap-8">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer text-xs font-medium uppercase transition-colors duration-200"
            style={{
              fontFamily: "var(--font-landing)",
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.1em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-orange-ember)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            {link.label}
          </a>
        ))}
      </div>

      <p
        className="text-xs"
        style={{ fontFamily: "var(--font-landing)", color: "rgba(255,255,255,0.13)" }}
      >
        © {new Date().getFullYear()} HSP-70 · Todos los derechos reservados
      </p>
    </footer>
  );
}
