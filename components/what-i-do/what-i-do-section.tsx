import { whatIDoData } from "@/data/what-i-do-data";
import { WhatIDoIntro } from "./what-i-do-intro";
import { WhatIDoList } from "./what-i-do-list";

export function WhatIDoSection() {
  return (
    <section id="what-i-do" className="relative z-10 bg-transparent px-5 py-20 lg:py-28">
      <div className="mx-auto grid max-w-[1700px] items-center gap-12 lg:min-h-[85vh] lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-10">
        <WhatIDoIntro
          eyebrow={whatIDoData.eyebrow}
          description={whatIDoData.description}
          ctaLabel={whatIDoData.ctaLabel}
          ctaHref={whatIDoData.ctaHref}
        />
        <WhatIDoList items={whatIDoData.items} />
      </div>
    </section>
  );
}
