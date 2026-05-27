import LandingNav from "../components/landing/LandingNav";
import LandingHero from "../components/landing/LandingHero";
import LandingStats from "../components/landing/LandingStats";
import LandingActividades from "../components/landing/LandingActividades";
import LandingComoFunciona from "../components/landing/LandingComoFunciona";
import LandingPlanes from "../components/landing/LandingPlanes";
import LandingEquipo from "../components/landing/LandingEquipo";
import LandingContacto from "../components/landing/LandingContacto";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-black" style={{ scrollBehavior: "smooth" }}>
      <LandingNav />
      <LandingHero />
      <LandingStats />
      <LandingActividades />
      <LandingComoFunciona />
      <LandingPlanes />
      <LandingEquipo />
      <LandingContacto />
      <LandingFooter />
    </div>
  );
}
