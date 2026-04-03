import type { WorkItem } from "@/data/works-data";

interface WorksIndicatorProps {
  items: WorkItem[];
  activeIndex: number;
  ctaLabel: string;
}

export function WorksIndicator({
  items,
  activeIndex,
  ctaLabel,
}: WorksIndicatorProps) {
  return (
    <div className="mt-10 flex flex-col gap-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-3 transition-opacity duration-300"
          style={{ opacity: activeIndex === index ? 1 : 0.45 }}
        >
          <div
            className="aspect-video w-24 border border-white/10 bg-[#d9d9d9]"
            style={{
              backgroundImage: `linear-gradient(135deg, ${item.accent}55, rgba(255,255,255,0.08))`,
            }}
          />
          <div
            className="h-2 w-2 shrink-0"
            style={{
              backgroundColor: activeIndex === index ? "#d46a1f" : "#ffffff33",
            }}
          />
        </div>
      ))}

      <button className="mt-3 inline-flex w-fit items-center gap-2 bg-[#d4521f] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#be4516]">
        <span>{ctaLabel}</span>
        <span className="text-base leading-none">↗</span>
      </button>
    </div>
  );
}
