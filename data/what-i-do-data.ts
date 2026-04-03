export interface WhatIDoItem {
  id: string;
  label: string;
  tone?: "default" | "accent";
}

export interface WhatIDoContent {
  eyebrow: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  items: WhatIDoItem[];
}

export const whatIDoData: WhatIDoContent = {
  eyebrow: "What I Do",
  description:
    "I build across the stack, but frontend is where I create smooth, thoughtful, and addictive experiences.",
  ctaLabel: "More About Me",
  ctaHref: "#what-i-do",
  items: [
    {
      id: "mobile",
      label: "Mobile",
    },
    {
      id: "backend",
      label: "Backend",
    },
    {
      id: "frontend",
      label: "Frontend",
      tone: "accent",
    },
    {
      id: "fullstack",
      label: "Fullstack",
    },
  ],
};
