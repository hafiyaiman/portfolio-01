import { craftData } from "@/data/craft-data";

export function CraftSection() {
  return (
    <section
      id="craft"
      className="bg-brand text-brand-foreground min-h-svh px-4 py-20 sm:px-5 sm:py-32 lg:py-40"
    >
      <div className="mx-auto flex min-h-[calc(100svh-10rem)] max-w-[1700px] flex-col items-center justify-center sm:min-h-svh">
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="font-heading text-[1.8rem] font-black uppercase leading-[1.15] tracking-wider sm:text-[3.2rem] lg:text-[4rem]">
              {craftData.lines.map((line) => (
                <span
                  key={line.id}
                  className={`block ${
                    line.tone === "accent"
                      ? "text-brand-accent"
                      : "text-brand-foreground"
                  }`}
                >
                  {line.text}
                </span>
              ))}
            </h2>
          </div>
        </div>

        <p className="w-full text-center text-xs italic text-brand-foreground/88 sm:text-base">
          {craftData.footer}
        </p>
      </div>
    </section>
  );
}
