import { useParallax } from "../hooks/useParallax";
import LandingNav from "../components/landing/LandingNav";
import LandingHero from "../components/landing/LandingHero";
import LandingActividadesStrip from "../components/landing/LandingActividadesStrip";
import LandingActividades from "../components/landing/LandingActividades";
import LandingComoFunciona from "../components/landing/LandingComoFunciona";
import LandingPlanes from "../components/landing/LandingPlanes";
import LandingEquipo from "../components/landing/LandingEquipo";
import LandingContacto from "../components/landing/LandingContacto";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  useParallax();

  return (
    <div
      style={{
        fontFamily: "var(--font-landing)",
        backgroundColor: "var(--color-true-black)",
        color: "var(--color-deep-graphite)",
      }}
    >
      <LandingNav />
      <LandingHero />
      <LandingActividadesStrip />
      <LandingActividades />
      <LandingComoFunciona />
      <LandingPlanes />
      <LandingEquipo />
      <LandingContacto />
      <LandingFooter />
    </div>
  );
}
