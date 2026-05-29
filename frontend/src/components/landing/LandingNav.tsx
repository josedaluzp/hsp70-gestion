import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const NAV_LINKS = [
  { label: "Actividades", href: "#actividades" },
  { label: "Equipo",      href: "#equipo" },
  { label: "Planes",      href: "#planes" },
  { label: "Contacto",    href: "#contacto" },
];

export default function LandingNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const dashboardPath = user
    ? user.rol === "admin"    ? "/admin/dashboard"
    : user.rol === "profesor" ? "/profesor/dashboard"
    :                            "/alumno/dashboard"
    : "/login";

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  // The class (dark/light + optional sc) is applied by useParallax hook based
  // on which section is under the nav. We just paint styles per class.
  return (
    <nav
      id="landing-nav"
      className="dark"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 48px",
        height: "64px",
        transition: "background 280ms, backdrop-filter 280ms, border-color 280ms",
        fontFamily: "var(--font-landing)",
      }}
    >
      <style>{`
        #landing-nav { background: transparent; border-bottom: 1px solid transparent; }
        #landing-nav.dark.sc { background: rgba(20,20,20,0.9); backdrop-filter: blur(12px); border-bottom-color: rgba(255,255,255,0.08); }
        #landing-nav.light.sc { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom-color: var(--color-light-border); }
        #landing-nav.dark a.nl, #landing-nav.dark.sc a.nl { color: rgba(255,255,255,0.55); }
        #landing-nav.dark a.nl:hover, #landing-nav.dark.sc a.nl:hover { color: #fff; }
        #landing-nav.light a.nl, #landing-nav.light.sc a.nl { color: var(--color-muted-stone); }
        #landing-nav.light a.nl:hover, #landing-nav.light.sc a.nl:hover { color: var(--color-dark-charcoal); }
        #landing-nav .burger span { background: var(--color-deep-graphite); }
        #landing-nav.dark .burger span, #landing-nav.dark.sc .burger span { background: #fff; }
      `}</style>

      <Link to="/" style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
        <img src="/hsp-70-logo.png" alt="HSP-70" style={{ height: "36px", width: "auto" }} />
      </Link>

      {/* Desktop */}
      <div className="hidden md:flex" style={{ alignItems: "center", gap: "28px" }}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="nl"
            onClick={(e) => handleScrollTo(e, l.href)}
            style={{ fontSize: "13px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em", cursor: "pointer", transition: "color 180ms" }}
          >
            {l.label}
          </a>
        ))}
        <Link
          to={dashboardPath}
          style={{
            fontSize: "13px",
            fontWeight: 500,
            backgroundColor: "var(--color-light-mist)",
            color: "var(--color-dark-charcoal)",
            borderRadius: "var(--radius-amp-btn)",
            padding: "8px 16px",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          {user ? "Mi panel" : "Ingresar"}
        </Link>
        <Link
          to="/register"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "var(--color-orange-ember)",
            borderRadius: "var(--radius-amp-btn)",
            padding: "8px 20px",
            textDecoration: "none",
            boxShadow: "var(--shadow-amp-cta)",
            cursor: "pointer",
            transition: "opacity 180ms",
          }}
        >
          Empezar gratis
        </Link>
      </div>

      {/* Mobile burger */}
      <button
        className="md:hidden burger"
        onClick={() => setOpen(!open)}
        aria-label="Menú"
        style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "8px", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <span style={{ display: "block", width: "20px", height: "2px", transition: "all 200ms", transform: open ? "rotate(45deg) translate(0, 8px)" : "none" }} />
        <span style={{ display: "block", width: "20px", height: "2px", transition: "all 200ms", opacity: open ? 0 : 1 }} />
        <span style={{ display: "block", width: "20px", height: "2px", transition: "all 200ms", transform: open ? "rotate(-45deg) translate(0, -8px)" : "none" }} />
      </button>

      {/* Mobile menu drawer */}
      {open && (
        <div
          className="md:hidden"
          style={{
            position: "absolute",
            top: "64px",
            left: 0,
            right: 0,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            backgroundColor: "var(--color-white-canvas)",
            borderTop: "1px solid var(--color-light-border)",
          }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleScrollTo(e, l.href)}
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-dark-charcoal)", textDecoration: "none", cursor: "pointer" }}
            >
              {l.label}
            </a>
          ))}
          <Link
            to={dashboardPath}
            onClick={() => setOpen(false)}
            style={{
              fontSize: "14px",
              fontWeight: 500,
              textAlign: "center",
              padding: "12px",
              backgroundColor: "var(--color-light-mist)",
              color: "var(--color-dark-charcoal)",
              borderRadius: "var(--radius-amp-btn)",
              textDecoration: "none",
            }}
          >
            {user ? "Mi panel" : "Ingresar"}
          </Link>
          <Link
            to="/register"
            onClick={() => setOpen(false)}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center",
              padding: "12px",
              backgroundColor: "var(--color-orange-ember)",
              color: "#fff",
              borderRadius: "var(--radius-amp-btn)",
              boxShadow: "var(--shadow-amp-cta)",
              textDecoration: "none",
            }}
          >
            Empezar gratis
          </Link>
        </div>
      )}
    </nav>
  );
}
