export interface FooterLink {
  href: string;
  label: string;
  download?: boolean;
}

export interface FooterSocialLink {
  href: string;
  label: string;
  platform: "linkedin" | "github" | "email";
}

export interface FooterContent {
  eyebrow: string;
  title: string[];
  description: string;
  locationLabel: string;
  availability: string;
  socialLinks: FooterSocialLink[];
  note: string;
}

export const footerData: FooterContent = {
  eyebrow: "Final Frame",
  title: ["Let's Build", "Something Smooth"],
  description:
    "I design and build interfaces that feel sharp on first glance and even better after a few minutes of use.",
  locationLabel: "Kuala Lumpur, Malaysia",
  availability:
    "Open to thoughtful product work, freelance builds, and frontend-heavy collaborations.",
  socialLinks: [
    {
      href: "https://www.linkedin.com/in/hafiy-aiman-husain/",
      label: "LinkedIn",
      platform: "linkedin",
    },
    {
      href: "https://github.com/hafiyaiman",
      label: "GitHub",
      platform: "github",
    },
    {
      platform: "email",
      label: "Email Me",
      href: "mailto:hafiyai00@gmail.com",
    },
  ],
  note: "Built with Next.js, GSAP, and a mild obsession with motion clarity.",
};
