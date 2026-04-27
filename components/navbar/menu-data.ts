export interface NavbarMenuLink {
  href: string;
  label: string;
  comingSoon?: boolean;
}

export const primaryMenuLinks: NavbarMenuLink[] = [
  { href: "/", label: "HOME" },
  { href: "/work", label: "WORK", comingSoon: true },
  { href: "/about", label: "ABOUT", comingSoon: true },
  { href: "/contact", label: "CONTACT", comingSoon: true },
];
