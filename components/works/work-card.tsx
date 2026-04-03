import type { WorkItem } from "@/data/works-data";

interface WorkCardProps {
  item: WorkItem;
}

export function WorkCard({ item }: WorkCardProps) {
  return (
    <article className="group flex w-full flex-col gap-4">
      <div
        className="relative aspect-video overflow-hidden border border-white/10 bg-[#111111]"
        style={{
          backgroundImage: `radial-gradient(circle at 18% 22%, ${item.accent}33, transparent 22%), linear-gradient(135deg, #202020 0%, #0b0b0b 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-7">
          <span className="border border-white/15 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.24em] text-white/80">
            Placeholder 16:9
          </span>
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: item.accent }}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <h3 className="max-w-3xl text-3xl font-bold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
            {item.subtitle}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-white sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h4 className="text-2xl font-semibold">{item.title}</h4>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            {item.description}
          </p>
        </div>
        <p className="text-sm text-white/80 sm:pt-1">
          [{item.stack.join("] [")}]
        </p>
      </div>
    </article>
  );
}
