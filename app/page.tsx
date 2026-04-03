import { CraftSection } from "@/components/craft/craft-section";
import { HeroSection } from "@/components/hero/hero-section";
// import { JourneySection } from "@/components/journey/journey-section";
import { Navbar } from "@/components/navbar";
import { WhatIDoMaskSequence } from "@/components/what-i-do/what-i-do-mask-sequence";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#f7f4ef] text-[#1d140f]">
      <Navbar />
      <HeroSection />
      <WhatIDoMaskSequence />
      <CraftSection />
      {/* <JourneySection /> */}
    </main>
  );
}
