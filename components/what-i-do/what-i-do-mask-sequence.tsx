import { WorksSection } from "@/components/works/works-section";
import { whatIDoData } from "@/data/what-i-do-data";

import { WhatIDoIntro } from "./what-i-do-intro";
import { WhatIDoList } from "./what-i-do-list";
import { WhatIDoMaskSequenceClient } from "./what-i-do-mask-sequence-client";

export function WhatIDoMaskSequence() {
  const intro = (
    <WhatIDoIntro
      eyebrow={whatIDoData.eyebrow}
      description={whatIDoData.description}
      ctaLabel={whatIDoData.ctaLabel}
      ctaHref={whatIDoData.ctaHref}
    />
  );

  const list = <WhatIDoList items={whatIDoData.items} />;

  return (
    <WhatIDoMaskSequenceClient
      intro={intro}
      list={list}
      fallbackContent={
        <>
          <section
            id="what-i-do"
            className="relative z-10 min-h-svh bg-transparent px-5 py-20 lg:py-28"
          >
            <div className="mx-auto grid min-h-[calc(100svh-10rem)] max-w-[1700px] items-center gap-12 lg:min-h-[85vh] lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-10">
              {intro}
              {list}
            </div>
          </section>
          <WorksSection />
        </>
      }
    />
  );
}
