import { EQUIPO } from "./data";

function MemberCard({ nombre, rol, foto }: { nombre: string; rol: string; foto: string }) {
  return (
    <div className="flex flex-col bg-neutral-950 border border-neutral-900 overflow-hidden group">
      <div className="relative overflow-hidden aspect-square bg-neutral-900">
        <img
          src={foto}
          alt={nombre}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const fallback = target.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.classList.remove("hidden");
          }}
        />
        {/* Fallback avatar */}
        <div className="hidden absolute inset-0 flex items-center justify-center bg-neutral-900">
          <div className="w-16 h-16 rounded-full bg-neutral-800 border-2 border-orange-500/30" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
      </div>
      <div className="px-3 py-3">
        <div className="text-xs font-black uppercase tracking-wide text-white leading-tight">{nombre}</div>
        <div className="text-[10px] text-neutral-600 mt-1">{rol}</div>
      </div>
    </div>
  );
}

export default function LandingEquipo() {
  return (
    <section id="equipo" className="bg-black py-20 px-4 sm:px-6 border-b border-neutral-900">
      <div className="max-w-4xl mx-auto">
        <p className="text-[10px] font-black tracking-[0.5em] text-orange-500 uppercase mb-3">
          Quiénes somos
        </p>
        <h2 className="text-4xl sm:text-5xl font-black uppercase leading-none mb-12 text-white">
          EL EQUIPO
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EQUIPO.map((m) => (
            <MemberCard key={m.nombre} {...m} />
          ))}
        </div>

        <div className="mt-10">
          <p className="text-[10px] font-bold tracking-[0.3em] text-neutral-700 uppercase mb-4">
            Deportistas que entrenan con nosotros
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-video bg-neutral-950 border border-neutral-900 flex items-center justify-center"
              >
                <span className="text-[9px] tracking-widest text-neutral-800 uppercase">Foto atleta</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
