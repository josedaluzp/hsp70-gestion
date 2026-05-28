import { PASOS } from "./data";

export default function LandingComoFunciona() {
  return (
    <section className="bg-orange-500 py-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-[10px] font-black tracking-[0.5em] text-black/50 uppercase mb-3">
          El sistema
        </p>
        <h2 className="text-4xl sm:text-5xl font-black uppercase leading-none mb-12 text-black">
          CÓMO FUNCIONA
        </h2>

        <div className="flex flex-col gap-0">
          {PASOS.map((paso, i) => (
            <div key={paso.n}>
              <div className="flex items-start gap-5">
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-orange-500">{paso.n}</span>
                </div>
                <div>
                  <div className="text-base font-black uppercase tracking-wide text-black">
                    {paso.titulo}
                  </div>
                  <div className="text-sm text-black/60 mt-1 leading-relaxed">
                    {paso.desc}
                  </div>
                </div>
              </div>
              {i < PASOS.length - 1 && (
                <div className="w-px h-8 bg-black/20 ml-5 my-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
