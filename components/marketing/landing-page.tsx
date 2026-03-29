import { ToknMarketingStyles } from "@/components/marketing/marketing-styles";
import { ToknLandingReveal } from "@/components/marketing/landing/reveal";
import { ToknNavbar } from "@/components/marketing/landing/navbar";
import { ToknHero } from "@/components/marketing/landing/hero";
import { ToknProblem } from "@/components/marketing/landing/problem";
import { ToknHowItWorks } from "@/components/marketing/landing/how-it-works";
import { ToknFeatures } from "@/components/marketing/landing/features";
import { ToknMcpSection } from "@/components/marketing/landing/mcp-section";
import { ToknSocialProof } from "@/components/marketing/landing/social-proof";
import { ToknPricing } from "@/components/marketing/landing/pricing";
import { ToknFinalCta } from "@/components/marketing/landing/final-cta";
import { ToknFooter } from "@/components/marketing/landing/footer";

type ToknLandingPageProps = {
  signedIn?: boolean;
};

export function ToknLandingPage({ signedIn = false }: ToknLandingPageProps) {
  return (
    <>
      <ToknMarketingStyles />
      <ToknLandingReveal>
        <ToknNavbar signedIn={signedIn} />
        <ToknHero signedIn={signedIn} />
        <ToknProblem />
        <ToknHowItWorks />
        <ToknFeatures />
        <ToknMcpSection />
        {/* <ToknSocialProof /> */}
        {/* <ToknPricing /> */}
        <ToknFinalCta />
        <ToknFooter />
      </ToknLandingReveal>
    </>
  );
}

export default ToknLandingPage;

