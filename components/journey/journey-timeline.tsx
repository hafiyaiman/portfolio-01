import { journeyData } from "@/data/journey-data";

interface JourneyTimelineProps {
  railRef: React.RefObject<HTMLDivElement | null>;
  panelRefs: React.MutableRefObject<Array<HTMLElement | null>>;
  activeIndex: number;
}

export function JourneyTimeline({
  railRef,
  panelRefs,
  activeIndex,
}: JourneyTimelineProps) {
  return (
    <div
      ref={railRef}
      className="flex flex-col gap-4 lg:w-max lg:flex-row lg:gap-6"
    >
      {journeyData.milestones.map((milestone, index) => {
        const isActive = index === activeIndex;

        return (
          <article
            key={milestone.id}
            ref={(node) => {
              panelRefs.current[index] = node;
            }}
            className="w-full rounded-[1.75rem] border border-[#3a0b05]/10 bg-white/75 p-6 backdrop-blur-sm transition-[border-color,transform,box-shadow] duration-300 sm:p-7 lg:min-h-[28rem] lg:w-[38vw] lg:min-w-[32rem] lg:max-w-[42rem] lg:p-9"
            style={{
              borderColor: isActive ? "rgba(212,106,31,0.32)" : undefined,
              boxShadow: isActive
                ? "0 20px 50px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(212,106,31,0.12)"
                : "0 12px 28px rgba(0,0,0,0.04)",
              transform: isActive ? "translateY(-6px)" : "translateY(0px)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#8a6a58]">
                  {milestone.eyebrow}
                </p>
                <h3 className="mt-4 w-full font-heading text-[1.8rem] font-black uppercase leading-[0.96] tracking-tight text-[#3a0b05] sm:text-[2.2rem] lg:text-[2.8rem]">
                  {milestone.title}
                </h3>
              </div>

              <span className="shrink-0 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-[#d46a1f]">
                {milestone.year}
              </span>
            </div>

            <div className="mt-10 flex items-center gap-3">
              {journeyData.milestones.map((item, dotIndex) => (
                <div
                  key={item.id}
                  className="h-px flex-1"
                  style={{
                    backgroundColor:
                      dotIndex <= activeIndex ? "#d46a1f" : "rgba(58,11,5,0.14)",
                  }}
                />
              ))}
            </div>

            <p className="mt-10 w-full text-sm leading-7 text-[#3a0b05]/72 sm:text-base sm:leading-8 lg:text-lg">
              {milestone.description}
            </p>

            {milestone.meta ? (
              <p className="mt-6 text-sm uppercase tracking-[0.16em] text-[#8a6a58]">
                {milestone.meta}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
