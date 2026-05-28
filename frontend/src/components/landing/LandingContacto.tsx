export default function LandingContacto() {
  const waUrl = "https://wa.me/5492976257545?text=Hola!%20Quiero%20saber%20m%C3%A1s%20sobre%20HSP-70";

  return (
    <section id="contacto" className="bg-black py-20 px-4 sm:px-6 border-b border-neutral-900">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] font-black tracking-[0.5em] text-orange-500 uppercase mb-3">
          Encontranos
        </p>
        <h2 className="text-4xl sm:text-5xl font-black uppercase leading-none mb-12 text-white">
          UBICACIÓN
        </h2>

        {/* Google Maps embed */}
        <div className="w-full h-52 mb-8 border border-neutral-900 overflow-hidden">
          <iframe
            title="HSP-70 ubicación"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2930.1!2d-67.4956!3d-45.8654!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSan%20Mart%C3%ADn%201085%2C%20Comodoro%20Rivadavia!5e0!3m2!1ses!2sar!4v1"
            width="100%"
            height="100%"
            style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="flex flex-col gap-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-orange-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-white">San Martín 1085</div>
              <div className="text-xs text-neutral-600">Comodoro Rivadavia, Chubut</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-orange-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-white">+549 297 6257545</div>
              <div className="text-xs text-neutral-600">Llamadas y mensajes</div>
            </div>
          </div>
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-[#25d366] text-white px-6 py-4 text-sm font-black tracking-widest uppercase hover:bg-[#22c55e] transition-colors w-full sm:w-auto"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          ESCRIBINOS POR WHATSAPP
        </a>
      </div>
    </section>
  );
}
