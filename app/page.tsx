import { HeroHeader } from "@/components/hero-header";
import { HeroParallax } from "@/components/hero-parallax";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1d140f]">
      <section className="relative min-h-screen w-full overflow-hidden pb-6 lg:pb-10 px-5">
        <HeroHeader />

        <div className="relative mt-4 flex min-h-[calc(100vh-6rem)] flex-col">
          <HeroParallax />

          <div className="relative z-10 mt-auto flex flex-col gap-6 ">
            {/* Row 1: "SOFTWARE" left, "Kuala Lumpur" right */}
            <div className="flex items-end justify-between">
              <span className="tracking-wide font-heading text-[4.2rem] font-black uppercase leading-[0.82] tracking-[-0.06em] text-[#4b0600] sm:text-[6.5rem] md:text-[8.5rem] lg:text-[11rem] xl:text-[148px]">
                Software
              </span>
              <p className="text-right text-sm italic text-[#2f211a] sm:text-base ">
                Kuala Lumpur, Malaysia
              </p>
            </div>

            {/* Row 2: tagline left, "ENGINEER" right */}
            <div className="flex items-start justify-between">
              <p className="hidden max-w-[22rem] text-[0.85rem] leading-[1.35] text-black sm:block sm:max-w-[28rem] sm:text-[1rem] lg:max-w-[32rem] lg:pb-2 lg:text-[1.1rem] pt-3">
                I turn complex ideas into interfaces that just <em>work</em>.
                <br />
                Fast, clean, and sometimes even a little addictive.
              </p>
              <span className="tracking-wide font-heading text-[4.2rem] font-black uppercase leading-[0.82] tracking-[-0.06em] text-[#4b0600] sm:text-[6.5rem] md:text-[8.5rem] lg:text-[11rem] xl:text-[148px]">
                Engineer
              </span>
            </div>

            {/* Tagline for mobile only */}
            <p className="mt-3 text-lg leading-[1.35] text-black sm:hidden">
              I turn complex ideas into interfaces that just <em>work</em>.
              Fast, clean, and sometimes even a little addictive.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
