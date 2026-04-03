import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface WhatIDoIntroProps {
  eyebrow: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export function WhatIDoIntro({
  eyebrow,
  description,
  ctaLabel,
  ctaHref,
}: WhatIDoIntroProps) {
  return (
    <div className="flex max-w-sm flex-col gap-5 lg:max-w-xs lg:gap-8">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#7b6253]">
          {eyebrow}
        </p>
        <p className="max-w-[20rem] text-base leading-[1.35] text-[#1d140f] sm:max-w-[18rem] sm:text-lg">
          {description}
        </p>
      </div>

      <Link
        href={ctaHref}
        className="inline-flex w-fit items-center gap-2 bg-[#d4521f] px-4 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
      >
        <span>{ctaLabel}</span>
        <span className="grid size-5 place-items-center border border-white/30 text-[0.7rem]">
          <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
        </span>
      </Link>
    </div>
  );
}
