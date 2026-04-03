import { journeyData } from "@/data/journey-data";

interface JourneyTimelineProps {
  activeIndex: number;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  markerRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  cardRefs: React.MutableRefObject<Array<HTMLElement | null>>;
}

export function JourneyTimeline({
  activeIndex,
  timelineRef,
  markerRefs,
  cardRefs,
}: JourneyTimelineProps) {
  return (
    <div ref={timelineRef} className="space-y-12 sm:space-y-20">
      {journeyData.milestones.map((milestone, index) => {
        const isReversed = index % 2 === 1;
        const isActive = index === activeIndex;

        return (
          <article
            key={milestone.id}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className="grid items-center gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12"
          >
            <div className={isReversed ? "lg:order-2" : undefined}>
              <div
                ref={(node) => {
                  markerRefs.current[index] = node;
                }}
                className="relative mx-auto aspect-square w-[132px] overflow-hidden border bg-[#f1ebe2] shadow-[0_10px_24px_rgba(0,0,0,0.05)] transition-all duration-300 sm:w-[210px]"
                style={{
                  borderColor: isActive
                    ? "rgba(59,130,246,0.95)"
                    : "rgba(58,11,5,0.18)",
                  boxShadow: isActive
                    ? "0 0 0 1px rgba(59,130,246,0.2), 0 18px 34px rgba(0,0,0,0.08)"
                    : "0 10px 24px rgba(0,0,0,0.05)",
                }}
              />
            </div>

            <div
              className={`max-w-[36rem] text-center lg:text-left ${
                isReversed ? "lg:order-1 lg:justify-self-start" : "lg:justify-self-start"
              }`}
            >
              <p className="text-[0.7rem] uppercase tracking-[0.26em] text-[#8a6a58]">
                {milestone.year}
              </p>
              <p className="mt-3 text-sm font-medium uppercase tracking-[0.16em] text-[#d46a1f]">
                {milestone.eyebrow}
              </p>
              <h3 className="mt-4 text-lg font-semibold leading-tight text-[#3a0b05] sm:text-[1.75rem]">
                {milestone.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#3a0b05]/74 sm:text-lg sm:leading-8">
                {milestone.description}
              </p>
              {milestone.meta ? (
                <p className="mt-5 text-sm uppercase tracking-[0.15em] text-[#8a6a58]">
                  {milestone.meta}
                </p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
