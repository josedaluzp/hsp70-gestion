import { Link } from "react-router-dom";
import { PLANES } from "./data";

export default function LandingPlanes() {
  return (
    <section id="planes" className="bg-black py-20 px-4 sm:px-6 border-b border-neutral-900">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] font-black tracking-[0.5em] text-orange-500 uppercase mb-3">
          Flexibilidad total
        </p>
        <h2 className="text-4xl sm:text-5xl font-black uppercase leading-none mb-12 text-white">
          PACKS DE CRÉDITOS
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANES.map((plan) => {
            const featured = plan.badge !== null;
            return (
              <div
                key={plan.nombre}
                className={`relative flex flex-col p-6 border transition-colors ${
                  featured
                    ? "border-orange-500 bg-neutral-950"
                    : "border-neutral-900 bg-neutral-950/50 hover:border-neutral-700"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-orange-500 text-black text-[9px] font-black tracking-widest uppercase px-3 py-1 whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className={`text-sm font-black uppercase tracking-widest mb-2 ${featured ? "text-orange-500 mt-4" : "text-white"}`}>
                  {plan.nombre}
                </div>

                <div className="text-5xl font-black text-orange-500 leading-none">{plan.creditos}</div>
                <div className="text-[9px] font-bold tracking-[0.3em] text-neutral-600 uppercase mb-6">créditos</div>

                <ul className="flex flex-col gap-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-neutral-500 flex items-center gap-2">
                      <span className="text-orange-500">—</span> {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`text-center py-3 text-xs font-black tracking-widest uppercase transition-colors ${
                    featured
                      ? "bg-orange-500 text-black hover:bg-orange-400"
                      : "border border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                  }`}
                >
                  EMPEZAR
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-neutral-700 text-center mt-6">
          Precios a confirmar · 1 crédito = 1 clase en cualquier actividad
        </p>
      </div>
    </section>
  );
}
