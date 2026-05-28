import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const NAV_LINKS = [
  { label: "Actividades", href: "#actividades" },
  { label: "Equipo", href: "#equipo" },
  { label: "Planes", href: "#planes" },
  { label: "Contacto", href: "#contacto" },
];

export default function LandingNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashboardPath = user
    ? user.rol === "admin" ? "/admin/dashboard"
    : user.rol === "profesor" ? "/profesor/dashboard"
    : "/alumno/dashboard"
    : "/login";

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <nav
      style={{
        fontFamily: "var(--font-landing)",
        backgroundColor: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid var(--color-light-border)" : "none",
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="cursor-pointer"
        >
          <img src="/hsp-70-logo.png" alt="HSP-70" className="h-9 w-auto" />
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleScrollTo(e, l.href)}
              className="cursor-pointer text-sm font-medium transition-colors duration-200"
              style={{ color: "var(--color-muted-stone)", letterSpacing: "0.02em" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-deep-graphite)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted-stone)")}
            >
              {l.label}
            </a>
          ))}

          <Link
            to={dashboardPath}
            className="cursor-pointer text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: "var(--color-light-mist)",
              color: "var(--color-dark-charcoal)",
              borderRadius: "var(--radius-amp-btn)",
              padding: "8px 16px",
            }}
          >
            {user ? "Mi panel" : "Ingresar"}
          </Link>

          <Link
            to="/register"
            className="cursor-pointer text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
            style={{
              backgroundColor: "var(--color-orange-ember)",
              borderRadius: "var(--radius-amp-btn)",
              padding: "8px 16px",
              boxShadow: "var(--shadow-amp-cta)",
            }}
          >
            Empezar gratis
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          <span className="block w-5 h-0.5 transition-all duration-200" style={{ backgroundColor: "var(--color-deep-graphite)", transform: open ? "rotate(45deg) translate(0, 8px)" : "none" }} />
          <span className="block w-5 h-0.5 transition-all duration-200" style={{ backgroundColor: "var(--color-deep-graphite)", opacity: open ? 0 : 1 }} />
          <span className="block w-5 h-0.5 transition-all duration-200" style={{ backgroundColor: "var(--color-deep-graphite)", transform: open ? "rotate(-45deg) translate(0, -8px)" : "none" }} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-6 py-5 flex flex-col gap-4" style={{ backgroundColor: "var(--color-white-canvas)", borderTop: "1px solid var(--color-light-border)" }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => handleScrollTo(e, l.href)} className="cursor-pointer text-sm font-medium" style={{ color: "var(--color-dark-charcoal)" }}>
              {l.label}
            </a>
          ))}
          <Link to={dashboardPath} onClick={() => setOpen(false)} className="cursor-pointer text-sm font-medium text-center py-3" style={{ backgroundColor: "var(--color-light-mist)", color: "var(--color-dark-charcoal)", borderRadius: "var(--radius-amp-btn)" }}>
            {user ? "Mi panel" : "Ingresar"}
          </Link>
          <Link to="/register" onClick={() => setOpen(false)} className="cursor-pointer text-sm font-semibold text-white text-center py-3" style={{ backgroundColor: "var(--color-orange-ember)", borderRadius: "var(--radius-amp-btn)", boxShadow: "var(--shadow-amp-cta)" }}>
            Empezar gratis
          </Link>
        </div>
      )}
    </nav>
  );
}
