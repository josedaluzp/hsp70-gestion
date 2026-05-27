import { ACTIVIDADES } from "./data";

export default function LandingActividades() {
  return (
    <section id="actividades" className="bg-black py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] font-black tracking-[0.5em] text-orange-500 uppercase mb-3">
          Lo que hacemos
        </p>
        <h2 className="text-4xl sm:text-5xl font-black uppercase leading-none mb-12 text-white">
          ACTIVIDADES
        </h2>

        <div className="flex flex-col divide-y divide-neutral-900/60">
          {ACTIVIDADES.map((a) => (
            <div
              key={a.num}
              className="flex items-center gap-5 py-5 group cursor-default"
            >
              <span className="text-sm font-black text-orange-500 w-8 flex-shrink-0 font-mono">
                {a.num}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black uppercase tracking-wide text-white group-hover:text-orange-500 transition-colors">
                  {a.nombre}
                </div>
                <div className="text-xs text-neutral-600 mt-0.5">{a.desc}</div>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-neutral-700 border border-neutral-800 px-2 py-1 flex-shrink-0 uppercase">
                {a.duracion}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
