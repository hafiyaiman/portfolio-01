export interface NavbarMenuLink {
  href: string;
  label: string;
  comingSoon?: boolean;
}

export const primaryMenuLinks: NavbarMenuLink[] = [
  { href: "/", label: "HOME" },
  { href: "/works", label: "WORK", comingSoon: true },
  { href: "/about", label: "ABOUT", comingSoon: true },
  { href: "/#footer", label: "CONTACT" },
];
