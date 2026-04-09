import { FooterSection } from "@/components/footer/footer-section";
import { MorphFooterRevealClient } from "@/components/footer/morph-footer-reveal-client";

interface MorphFooterRevealProps {
  baseClassName?: string;
  morphPrimaryColor?: string;
  morphSecondaryColor?: string;
  morphStrokeColor?: string;
}

export function MorphFooterReveal(props: MorphFooterRevealProps) {
  return (
    <MorphFooterRevealClient
      {...props}
      fallbackContent={<FooterSection />}
      footerContent={<FooterSection standalone={false} />}
    />
  );
}
