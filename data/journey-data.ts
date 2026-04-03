export interface JourneyMilestone {
  id: string;
  year: string;
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
}

export interface JourneyContent {
  eyebrow: string;
  title: string;
  intro: string;
  footer: string;
  milestones: JourneyMilestone[];
}

export const journeyData: JourneyContent = {
  eyebrow: "My Journey",
  title: "Built through curiosity, sharpened through craft.",
  intro:
    "My journey into tech started back in high school, around the time everyone was choosing their university path. While people were still figuring out what they wanted, I already knew one thing about myself: I like building things that can make life easier.",
  footer:
    "That path led me here. Still learning. Still building. Still excited about what I can create next.",
  milestones: [
    {
      id: "high-school",
      year: "Before 2019",
      eyebrow: "The instinct",
      title: "I trusted the feeling that I should build useful things.",
      description:
        "While other people were still deciding what to do next, I already knew I wanted to make things that solved real problems for real people.",
    },
    {
      id: "diploma",
      year: "2019",
      eyebrow: "The start",
      title: "Diploma in Information Technology at UTHM.",
      description:
        "That was my first choice, and it became the place where everything really began. I stepped into code, broke things, fixed things, and slowly found my direction.",
    },
    {
      id: "graduate-diploma",
      year: "2022",
      eyebrow: "The first milestone",
      title: "Graduated with a CGPA of 3.77 and a clearer picture.",
      description:
        "By the end of the diploma, I had more than grades. I had momentum, confidence, and a better sense of the kind of builder I wanted to become.",
      meta: "UTHM Diploma in Information Technology",
    },
    {
      id: "degree",
      year: "2022 - 2025",
      eyebrow: "Fast track",
      title: "Bachelor of Computer Science in Software Engineering.",
      description:
        "Three more years meant deeper concepts, bigger projects, and a stronger understanding of how real systems work beyond the surface.",
      meta: "Graduated in 2025 with a CGPA of 3.58",
    },
    {
      id: "frontend-love",
      year: "Along the way",
      eyebrow: "The realization",
      title: "UI, UX, motion, and frontend became the part I loved most.",
      description:
        "In my free time, I kept exploring interface design, design patterns, and new frontend technologies. I became obsessed with how good interfaces feel and how small details change the whole experience.",
    },
    {
      id: "now",
      year: "Now",
      eyebrow: "The direction",
      title: "Still learning, still building, still aiming higher.",
      description:
        "That curiosity never really stopped. It just became more focused. Every project keeps pulling me further toward thoughtful, high-quality digital experiences.",
    },
  ],
};
