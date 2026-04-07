export interface FooterLink {
  href: string;
  label: string;
  download?: boolean;
}

export interface FooterContent {
  eyebrow: string;
  title: string[];
  description: string;
  locationLabel: string;
  availability: string;
  links: FooterLink[];
  note: string;
}

export const footerData: FooterContent = {
  eyebrow: "Final Frame",
  title: ["Let's Build", "Something Smooth"],
  description:
    "I design and build interfaces that feel sharp on first glance and even better after a few minutes of use.",
  locationLabel: "Kuala Lumpur, Malaysia",
  availability: "Open to thoughtful product work, freelance builds, and frontend-heavy collaborations.",
  links: [
    { href: "/about", label: "About" },
    { href: "/works", label: "Works" },
    {
      href: "/cv/1Apr26ResumeHafiy.pdf",
      label: "Download CV",
      download: true,
    },
  ],
  note: "Built with Next.js, GSAP, and a mild obsession with motion clarity.",
};
