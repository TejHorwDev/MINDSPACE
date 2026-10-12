import { getAuthSession } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Motion } from "@/components/landing/motion";
import { Hero } from "@/components/landing/hero";
import { BentoGrid } from "@/components/landing/bento-grid";
import { TemplatePreviewStrip } from "@/components/landing/template-preview-strip";
import { StepsSection } from "@/components/landing/steps-section";
import { CtaSection } from "@/components/landing/cta-section";

export default async function LandingPage() {
  const session = await getAuthSession();
  const authed = !!session?.user;

  return (
    <>
      <SiteHeader
        authed={authed}
        isAdmin={session?.user?.role === "admin"}
        name={session?.user?.name}
        email={session?.user?.email}
      />

      <Motion>
        <main className="flex flex-1 flex-col">
          <Hero authed={authed} />
          <BentoGrid />
          <TemplatePreviewStrip />
          <StepsSection />
          <CtaSection authed={authed} />
        </main>
      </Motion>

      <SiteFooter />
    </>
  );
}
