import type { ReactNode } from "react";

export interface HeroContent {
  titleTop: string;
  titleBottom: string;
  location: string;
  desktopTagline: ReactNode;
  mobileTagline: ReactNode;
}

export const heroData: HeroContent = {
  titleTop: "Software",
  titleBottom: "Engineer",
  location: "Kuala Lumpur, Malaysia",
  desktopTagline: (
    <>
      I turn complex ideas into interfaces that just <em>work</em>.
      <br />
      Fast, clean, and sometimes even a little addictive.
    </>
  ),
  mobileTagline: (
    <>
      I turn complex ideas into interfaces that just <em>work</em>. Fast,
      clean, and sometimes even a little addictive.
    </>
  ),
};
