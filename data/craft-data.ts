export interface CraftLine {
  id: string;
  text: string;
  tone?: "default" | "accent";
}

export interface CraftContent {
  lines: CraftLine[];
  footer: string;
}

export const craftData: CraftContent = {
  lines: [
    {
      id: "code",
      text: "I don't just code.",
    },
    {
      id: "craft",
      text: "I craft experiences.",
      tone: "accent",
    },
    {
      id: "obsess",
      text: "I obsess over smooth",
    },
    {
      id: "animations",
      text: "animations, clear layouts,",
    },
    {
      id: "moments",
      text: "and moments that make users smile.",
    },
  ],
  footer:
    "Want to peek behind the curtain? I'll show you how the magic happens...",
};
