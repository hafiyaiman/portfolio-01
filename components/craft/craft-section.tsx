import { craftData } from "@/data/craft-data";

export function CraftSection() {
  return (
    <section
      id="craft"
      className="bg-[#4b0600] px-4 py-20 text-white sm:px-5 sm:py-32 lg:py-40"
    >
      <div className="mx-auto flex min-h-[80vh] max-w-[1700px] flex-col items-center justify-center sm:min-h-screen">
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="font-heading text-[1.8rem] font-black uppercase leading-[1.15] tracking-wide sm:text-[3.2rem] lg:text-[4rem]">
              {craftData.lines.map((line) => (
                <span
                  key={line.id}
                  className={`block ${
                    line.tone === "accent" ? "text-[#d46a1f]" : "text-white"
                  }`}
                >
                  {line.text}
                </span>
              ))}
            </h2>
          </div>
        </div>

        <p className="w-full text-center text-xs italic text-white/88 sm:text-base">
          {craftData.footer}
        </p>
      </div>
    </section>
  );
}
