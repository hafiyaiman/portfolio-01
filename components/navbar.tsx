import { LiveClock } from "@/components/live-clock";
import Image from "next/image";

export function Navbar() {
  return (
    <>
      {/* Structural navbar — transparent, no blend, handles layout/spacing */}
      <header className="sticky top-0 z-40 px-4 py-2 sm:px-5">
        <div className="mx-auto grid max-w-[1700px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Logo — sits in normal flow, no blend */}
          <div className="flex items-center justify-start">
            <div className="h-14 w-14 overflow-hidden sm:h-20 sm:w-20">
              <Image
                src="/img/logo/logohafiymini.png"
                alt="HAH avatar"
                width={150}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Spacer cols to preserve layout */}
          <div className="hidden sm:block" />
          <div />
        </div>
      </header>

      {/* Separate fixed blend layer — blends against page content beneath */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 py-2 mix-blend-difference sm:px-5">
        <div className="mx-auto flex items-center justify-between max-w-[1700px] gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
          {/* HAH text only (logo excluded) */}
          <div className="flex items-center justify-start">
            <div className="h-14 w-14 sm:h-20 sm:w-20" />
            {/* spacer matching logo size */}
            <a
              href="#top"
              aria-label="Go to top"
              className="text-splash-foreground pointer-events-auto font-heading text-[1.7rem] font-black uppercase leading-none tracking-[-0.06em] sm:text-[2.4rem]"
            >
              HAH.
            </a>
          </div>
          <div className="text-splash-foreground hidden justify-self-center sm:block">
            <LiveClock />
          </div>
          <button
            aria-label="Open menu"
            className="text-splash-foreground pointer-events-auto ml-auto flex flex-col gap-1.5 p-1 sm:gap-[5px]"
          >
            <span className="block h-[2px] w-5 bg-current sm:w-6" />
            <span className="block h-[2px] w-5 bg-current sm:w-6" />
            <span className="block h-[2px] w-5 bg-current sm:w-6" />
          </button>
        </div>
      </div>
    </>
  );
}
