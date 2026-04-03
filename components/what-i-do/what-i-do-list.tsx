import type { WhatIDoItem } from "@/data/what-i-do-data";

interface WhatIDoListProps {
  items: WhatIDoItem[];
}

export function WhatIDoList({ items }: WhatIDoListProps) {
  return (
    <div className="flex flex-col items-start lg:items-start">
      {items.map((item) => (
        <p
          key={item.id}
          className={[
            "font-heading text-[2.85rem] font-black uppercase leading-[1.02] tracking-wider sm:text-[5.5rem] md:text-[7rem] lg:text-[8rem] xl:text-[9rem]",
            item.tone === "accent" ? "text-[#d4521f]" : "text-[#4b0600]",
          ].join(" ")}
        >
          {item.label}
        </p>
      ))}
    </div>
  );
}
