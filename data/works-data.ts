export interface WorkItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  stack: string[];
  accent: string;
}

export interface WorksContent {
  eyebrow: string;
  title: string[];
  description: string;
  ctaLabel: string;
  items: WorkItem[];
}

export const worksData: WorksContent = {
  eyebrow: "Selected Projects",
  title: ["Featured", "Works"],
  description:
    "Every project taught me one thing: smooth experiences are not accidental, they're deliberate.",
  ctaLabel: "View All",
  items: [
    {
      id: "d-park-village",
      title: "D Park Village",
      subtitle: "Park affordably. Travel confidently.",
      description:
        "A full stack parking platform focused on trust, ease, and fast booking flows across mobile and desktop.",
      stack: ["Full Stack", "Laravel"],
      accent: "#d46a1f",
    },
    {
      id: "invitation-rsvp",
      title: "Invitation Card with RSVP",
      subtitle: "Elegant invites with a polished response flow.",
      description:
        "A modern RSVP experience with guest tracking, event details, and frictionless submission states.",
      stack: ["Next.js", "TypeScript"],
      accent: "#d8b569",
    },
    {
      id: "portfolio-system",
      title: "Portfolio System",
      subtitle: "Editorial motion with modular content blocks.",
      description:
        "A visual storytelling site where layout, transitions, and typography work together as part of the product.",
      stack: ["Frontend", "GSAP"],
      accent: "#c94d3f",
    },
  ],
};
