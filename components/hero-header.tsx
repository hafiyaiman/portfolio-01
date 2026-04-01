import Image from "next/image";

import { LiveClock } from "@/components/live-clock";

export function HeroHeader() {
  return (
    <header className="relative z-20 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-20 w-50 overflow-hidden ">
          <Image
            src="/img/logo/logoHafiy.svg"
            alt="HAH avatar"
            width={150}
            height={40}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <LiveClock />

      <button aria-label="Open menu" className="flex flex-col gap-[5px] p-1">
        <span className="block h-[2px] w-6 bg-[#1d140f]" />
        <span className="block h-[2px] w-6 bg-[#1d140f]" />
        <span className="block h-[2px] w-6 bg-[#1d140f]" />
      </button>
    </header>
  );
}
