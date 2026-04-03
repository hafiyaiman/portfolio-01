import { HeroParallax } from "@/components/hero/hero-parallax";
import { heroData } from "@/data/hero-data";

export function HeroSection() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden px-4 pb-6 sm:px-5 lg:pb-10">
      <div className="relative flex min-h-[calc(100vh-4.5rem)] flex-col pt-2 sm:min-h-[calc(100vh-6rem)] sm:pt-4">
        <HeroParallax />

        <div className="relative z-10 mt-auto flex flex-col gap-2 sm:gap-3 xl:gap-4">
          {/* Location — always on top, hidden at xl (moves into row 1) */}
          <p className="text-xs italic text-[#2f211a] xl:hidden">
            {heroData.location}
          </p>

          {/* Row 1: titleTop + location (xl only) */}
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between">
            <span className="font-heading text-[2.65rem] font-black uppercase leading-[0.82] tracking--wider text-[#4b0600] sm:text-[6.5rem] md:text-[6.5rem] lg:text-[8rem] xl:text-[148px]">
              {heroData.titleTop}
            </span>
            <p className="hidden text-right text-base italic text-[#2f211a] xl:block">
              {heroData.location}
            </p>
          </div>

          {/* Row 2: titleBottom + tagline — flat in flex-col, swap order at xl */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between">
            <span className="font-heading text-[2.65rem] font-black uppercase leading-[0.82] tracking--wider text-[#4b0600] sm:text-[6.5rem] md:text-[6.5rem] lg:text-[8rem] xl:order-last xl:text-[148px]">
              {heroData.titleBottom}
            </span>
            <p className="max-w-[22rem] pt-1 text-[0.85rem] leading-[1.35] text-black xl:order-first xl:max-w-[28rem] xl:pt-3 xl:text-[1rem]">
              {heroData.desktopTagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
