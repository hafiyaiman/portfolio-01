import type { WorkItem } from "@/data/works-data";

interface WorksDetailsPanelProps {
  activeIndex: number;
  totalCount: number;
  activeItem: WorkItem;
}

export function WorksDetailsPanel({
  activeIndex,
  totalCount,
  activeItem,
}: WorksDetailsPanelProps) {
  const descriptionParagraphs = activeItem.description
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const hasPreview = Boolean(activeItem.previewHref);

  return (
    <div className="mt-8 flex min-w-0 flex-col gap-[clamp(1.5rem,2.4vw,2.5rem)] lg:mt-12 lg:min-h-[80vh]">
      <div className="w-full">
        <div className="flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-brand/30">
          <span className="tabular-nums">
            {String(activeIndex + 1).padStart(2, "0")}
            <span className="text-brand/10"> / </span>
            {String(totalCount).padStart(2, "0")}
          </span>
          <span className="h-px w-6 flex-shrink-0 bg-brand/20" />
          <span>{activeItem.year}</span>
        </div>

        <h2 className="mt-3 font-semibold text-[clamp(2.4rem,5.5vw,3.8rem)] leading-[1.08] tracking-wide text-brand uppercase">
          {activeItem.title}
        </h2>
        <p className="mt-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-brand/35">
          {activeItem.subtitle}
        </p>
        <div className="mt-5 space-y-4">
          {descriptionParagraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="font-sans text-[clamp(0.92rem,1.6vw,1.05rem)] font-light leading-[1.8] text-brand/60"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="border-t border-brand/10 pt-6 lg:mt-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {hasPreview ? (
            <a
              href={activeItem.previewHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 border border-brand/15 px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-brand transition-colors hover:border-brand/35 hover:bg-brand hover:text-background"
            >
              <span>Live Preview</span>
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex w-fit cursor-not-allowed items-center gap-2 border border-brand/10 px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-brand/30"
            >
              <span>Live Preview</span>
              <span aria-hidden="true">↗</span>
            </button>
          )}

          <div className="flex flex-wrap gap-2.5 sm:justify-end">
            {activeItem.stack.map((stackItem) => (
              <span
                key={stackItem}
                className="border border-brand/10 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-brand/45"
              >
                {stackItem}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
