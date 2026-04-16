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
}: WhatIDoIntroProps) {
  return (
    <div className="flex max-w-sm flex-col gap-5 lg:max-w-xs lg:gap-8">
      <div className="space-y-4">
        <p className="text-muted-ink text-sm font-medium uppercase tracking-[0.24em]">
          {eyebrow}
        </p>
        <p className="text-foreground max-w-[20rem] text-base leading-[1.35] sm:max-w-[18rem] sm:text-lg">
          {description}
        </p>
      </div>

      <span
        aria-disabled="true"
        title="Coming soon"
        className="bg-brand-accent text-brand-foreground inline-flex w-fit cursor-not-allowed items-center gap-2 px-4 py-3 text-sm font-semibold opacity-55"
      >
        <span>{ctaLabel}</span>
        <span className="grid size-5 place-items-center border border-brand-foreground/30 text-[0.7rem]">
          <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
        </span>
      </span>
    </div>
  );
}
