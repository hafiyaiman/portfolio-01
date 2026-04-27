export interface WorkItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  stack: string[];
  accent: string;
  imageSrc: string;
  imageAlt: string;
  year: string;
  previewHref?: string;
  previewImages?: Array<{
    src: string;
    alt: string;
  }>;
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
  title: ["Featured", "Work"],
  description:
    "I design and build products that prioritize clarity, performance, and real-world usability. My work focuses on translating ambiguous user needs into structured, scalable solutions while balancing technical constraints and business goals.",
  ctaLabel: "View All Projects",
  items: [
    {
      id: "d-park-village",
      title: "D Park Village",
      subtitle: "Parking booking platform",
      description:
        "D Park Village is a full-stack parking reservation system built to address fragmented availability visibility and inefficient manual booking workflows. The primary challenge was enabling users to make quick, confident decisions under time pressure while maintaining data consistency across reservations and time slots. The system needed to handle dynamic availability, prevent booking conflicts, and provide transparent pricing without overwhelming users.\n\nTo solve this, I designed a streamlined booking flow supported by real-time availability logic and structured backend validation. The platform centralizes slot management, reduces double-booking risks, and provides administrators with better operational control. The result is a faster, more reliable booking experience that improves both user decision-making and system integrity.",
      stack: ["Laravel", "PostgreSQL", "Full Stack"],
      accent: "#d46a1f",
      imageSrc: "/img/works/d-park-village.jpg",
      imageAlt: "D Park Village platform preview",
      year: "2025",
      previewHref: "",
      previewImages: [
        {
          src: "/img/works/d-park-village.jpg",
          alt: "D Park Village platform preview",
        },
        {
          src: "/img/works/kad-undangan.webp",
          alt: "D Park Village platform alternate preview",
        },
      ],
    },
    {
      id: "invitation-rsvp",
      title: "Digital Invitation",
      subtitle: "Modern event response system",
      description:
        "This project focuses on modernizing the traditional RSVP process, which is often fragmented across messaging apps and manual tracking methods. The key challenge was creating a system that maintains the aesthetic value of invitations while introducing a structured and reliable way to collect and manage guest responses in real time.\n\nI developed a mobile-first web experience that guides users through a clear response flow while storing structured data on the backend. Organizers can track attendance instantly, reduce coordination overhead, and avoid inconsistencies in guest information. The system transforms a previously manual process into a scalable and data-driven workflow.",
      stack: ["Next.js", "TypeScript", "Supabase"],
      accent: "#d8b569",
      imageSrc: "/img/works/kad-undangan.webp",
      imageAlt: "RSVP system preview",
      year: "2025",
      previewHref: "",
      previewImages: [
        {
          src: "/img/works/kad-undangan.webp",
          alt: "RSVP system preview",
        },
      ],
    },
    {
      id: "split-together",
      title: "Split Together",
      subtitle: "Expense splitting web app",
      description:
        "Split Together is a lightweight expense-splitting application designed to simplify group financial management, which is often perceived as tedious and error-prone. The main challenge was reducing cognitive load while ensuring accuracy and transparency in shared expense calculations, especially for users who are not familiar with finance tools.\n\nThe solution focuses on minimal input, real-time calculation feedback, and clear visual breakdowns of balances. By prioritizing clarity and simplicity in the interface, the application improves user understanding, reduces potential disputes, and makes expense tracking more approachable for everyday group use.",
      stack: ["Next.js", "Frontend"],
      accent: "#c94d3f",
      imageSrc: "/img/works/split-bills.webp",
      imageAlt: "Expense splitting app preview",
      year: "2024",
      previewHref: "https://split-together.hafiyai.link/",
      previewImages: [
        {
          src: "/img/works/split-bills.webp",
          alt: "Expense splitting app preview",
        },
      ],
    },
    // {
    //   id: "design-systems-lab",
    //   title: "Design Systems Lab",
    //   subtitle: "Component & interaction exploration",
    //   description:
    //     "Design Systems Lab is an exploration into solving inconsistencies and scalability challenges in front-end development across multiple projects. The problem centered around fragmented UI patterns, duplicated components, and the lack of a unified interaction standard, which slowed down development and reduced overall product cohesion.\n\nI created a collection of reusable components, structured design tokens, and interaction guidelines to standardize development practices. This system improves maintainability, accelerates iteration, and ensures a more consistent and polished user experience across different applications.",
    //   stack: ["React", "TypeScript", "GSAP"],
    //   accent: "#7f5af0",
    //   imageSrc: "/img/works/d-park-village.jpg",
    //   imageAlt: "Design system exploration preview",
    //   year: "2024",
    //   previewHref: "",
    //   previewImages: [
    //     {
    //       src: "/img/works/d-park-village.jpg",
    //       alt: "Design system exploration preview",
    //     },
    //     {
    //       src: "/img/works/d-park-village.webp",
    //       alt: "Design system exploration alternate preview",
    //     },
    //   ],
    // },
  ],
};
