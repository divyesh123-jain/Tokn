import { ToknMarketingStyles } from "@/components/tokn-marketing-styles";
import { ToknLandingReveal } from "@/components/tokn-landing/tokn-reveal";
import { ToknNavbar } from "@/components/tokn-landing/tokn-navbar";
import { ToknHero } from "@/components/tokn-landing/tokn-hero";
import { ToknProblem } from "@/components/tokn-landing/tokn-problem";
import { ToknHowItWorks } from "@/components/tokn-landing/tokn-how-it-works";
import { ToknFeatures } from "@/components/tokn-landing/tokn-features";
import { ToknMcpSection } from "@/components/tokn-landing/tokn-mcp-section";
import { ToknSocialProof } from "@/components/tokn-landing/tokn-social-proof";
import { ToknPricing } from "@/components/tokn-landing/tokn-pricing";
import { ToknFinalCta } from "@/components/tokn-landing/tokn-final-cta";
import { ToknFooter } from "@/components/tokn-landing/tokn-footer";

export function ToknLandingPage() {
  return (
    <>
      <ToknMarketingStyles />
      <ToknLandingReveal>
        <ToknNavbar />
        <ToknHero />
        <ToknProblem />
        <ToknHowItWorks />
        <ToknFeatures />
        <ToknMcpSection />
        <ToknSocialProof />
        {/* <ToknPricing /> */}
        <ToknFinalCta />
        <ToknFooter />
      </ToknLandingReveal>
    </>
  );
}

export default ToknLandingPage;

