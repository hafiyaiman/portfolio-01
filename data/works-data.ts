export interface WorkItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  stack: string[];
  accent: string;
  imageSrc: string;
  imageAlt: string;
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
      imageSrc: "/img/works/d-park-village.jpg",
      imageAlt: "D Park Village project preview",
    },
    {
      id: "invitation-rsvp",
      title: "Invitation Card with RSVP",
      subtitle: "Elegant invites with a polished response flow.",
      description:
        "A modern RSVP experience with guest tracking, event details, and frictionless submission states.",
      stack: ["Next.js", "TypeScript"],
      accent: "#d8b569",
      imageSrc: "/img/works/kad-undangan.png",
      imageAlt: "Invitation card RSVP project preview",
    },
    {
      id: "split-bills",
      title: "SplitTogether",
      subtitle: "Smart Bill Splitting",
      description:
        "A playful yet intuitive web app that helps friends split expenses effortlessly. Designed with smooth layout transitions, expressive typography, and GSAP-driven micro-interactions to make something as boring as splitting bills feel surprisingly fun.",
      stack: ["Frontend", "GSAP", "React"],
      accent: "#c94d3f",
      imageSrc: "/img/works/split-bills.png",
      imageAlt: "SplitTogether bill splitting webapp preview",
      // link: "https://split-together.hafiyai.link/",
    },
  ],
};
