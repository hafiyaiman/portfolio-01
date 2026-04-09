export interface NavbarMenuLink {
  href: string;
  label: string;
}

export const primaryMenuLinks: NavbarMenuLink[] = [
  { href: "/", label: "HOME" },
  { href: "/works", label: "WORK" },
  { href: "/about", label: "ABOUT" },
  { href: "/#footer", label: "CONTACT" },
];
