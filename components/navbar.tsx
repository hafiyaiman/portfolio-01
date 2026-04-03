import Image from "next/image";

import { LiveClock } from "@/components/live-clock";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-[#f7f4ef]/90 px-4 backdrop-blur-sm sm:px-5">
      <div className="mx-auto grid max-w-[1700px] grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center justify-start">
          <div className="h-14 w-32 overflow-hidden sm:h-20 sm:w-50">
            <Image
              src="/img/logo/logoHafiy.svg"
              alt="HAH avatar"
              width={150}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="hidden justify-self-center sm:block">
          <LiveClock />
        </div>

        <button
          aria-label="Open menu"
          className="ml-auto flex flex-col gap-1.5 p-1 sm:gap-[5px]"
        >
          <span className="block h-[2px] w-5 bg-[#1d140f] sm:w-6" />
          <span className="block h-[2px] w-5 bg-[#1d140f] sm:w-6" />
          <span className="block h-[2px] w-5 bg-[#1d140f] sm:w-6" />
        </button>
      </div>
    </header>
  );
}
