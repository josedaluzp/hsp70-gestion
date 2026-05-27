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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/95 backdrop-blur-md border-b border-neutral-900" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <img src="/hsp-70-logo.png" alt="HSP-70" className="h-10 w-auto" />
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleScrollTo(e, l.href)}
              className="text-xs font-bold tracking-widest text-neutral-500 uppercase hover:text-white transition-colors cursor-pointer"
            >
              {l.label}
            </a>
          ))}
          <Link
            to={dashboardPath}
            className="bg-orange-500 text-black px-4 py-2 text-xs font-black tracking-widest uppercase hover:bg-orange-400 transition-colors"
          >
            {user ? "MI PANEL" : "INGRESAR"}
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all ${open ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-black border-t border-neutral-900 px-4 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleScrollTo(e, l.href)}
              className="text-sm font-bold tracking-widest text-neutral-400 uppercase"
            >
              {l.label}
            </a>
          ))}
          <Link
            to={dashboardPath}
            onClick={() => setOpen(false)}
            className="bg-orange-500 text-black px-4 py-3 text-sm font-black tracking-widest uppercase text-center"
          >
            {user ? "MI PANEL" : "INGRESAR"}
          </Link>
        </div>
      )}
    </nav>
  );
}
