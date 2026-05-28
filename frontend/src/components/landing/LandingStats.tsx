import { STATS } from "./data";

export default function LandingStats() {
  return (
    <div className="grid grid-cols-3 divide-x divide-neutral-900 bg-black border-y border-neutral-900">
      {STATS.map((s) => (
        <div key={s.label} className="py-6 px-4 text-center">
          <div className="text-3xl sm:text-4xl font-black text-orange-500 leading-none">{s.valor}</div>
          <div className="text-[9px] font-bold tracking-[0.2em] text-neutral-600 uppercase mt-2">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
