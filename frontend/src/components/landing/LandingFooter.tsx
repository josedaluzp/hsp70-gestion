export default function LandingFooter() {
  return (
    <footer className="bg-black border-t border-neutral-900 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
        <img src="/hsp-70-logo.png" alt="HSP-70" className="h-12 w-auto opacity-70" />

        <p className="text-[10px] font-bold tracking-[0.4em] text-neutral-700 uppercase">
          Salud &amp; Ciencia · Comodoro Rivadavia
        </p>

        <div className="flex gap-8">
          <a
            href="https://www.instagram.com/saludcienciahsp70"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold tracking-widest text-neutral-700 uppercase hover:text-orange-500 transition-colors"
          >
            Instagram
          </a>
          <a
            href="https://www.facebook.com/saludcienciahsp70"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold tracking-widest text-neutral-700 uppercase hover:text-orange-500 transition-colors"
          >
            Facebook
          </a>
          <a
            href="https://wa.me/5492976257545"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold tracking-widest text-neutral-700 uppercase hover:text-orange-500 transition-colors"
          >
            WhatsApp
          </a>
        </div>

        <p className="text-[9px] text-neutral-800">
          © {new Date().getFullYear()} HSP-70 · Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
}
