import { HeroParallax } from "@/components/hero/hero-parallax";
import { heroData } from "@/data/hero-data";

export function HeroSection() {
  return (
    <section className="relative min-h-svh w-full overflow-hidden px-4 pb-6 sm:px-5 lg:pb-10">
      <div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col pt-2 sm:min-h-[calc(100svh-6rem)] sm:pt-4">
        <HeroParallax />

        <div className="relative z-10 mt-auto flex flex-col gap-2 sm:gap-3 xl:gap-4">
          {/* Location — always on top, hidden at xl (moves into row 1) */}
          <p className="text-hero-foreground text-xs italic xl:hidden">
            {heroData.location}
          </p>

          {/* Row 1: titleTop + location (xl only) */}
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between">
            <span className="text-brand font-heading text-[2.65rem] font-black uppercase leading-[0.82] tracking--wider sm:text-[6.5rem] md:text-[6.5rem] lg:text-[8rem] xl:text-[148px]">
              {heroData.titleTop}
            </span>
            <p className="text-hero-foreground hidden text-right text-base italic xl:block">
              {heroData.location}
            </p>
          </div>

          {/* Row 2: titleBottom + tagline — flat in flex-col, swap order at xl */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between">
            <span className="text-brand font-heading text-[2.65rem] font-black uppercase leading-[0.82] tracking--wider sm:text-[6.5rem] md:text-[6.5rem] lg:text-[8rem] xl:order-last xl:text-[148px]">
              {heroData.titleBottom}
            </span>
            <p className="text-foreground max-w-[22rem] pt-1 text-[0.85rem] leading-[1.35] xl:order-first xl:max-w-[28rem] xl:pt-3 xl:text-[1rem]">
              {heroData.desktopTagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
