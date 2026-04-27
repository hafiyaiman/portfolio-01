import { footerData } from "@/data/footer-data";
import { FooterOrbitInteraction } from "./footer-orbit-interaction";
import { FaGithub } from "react-icons/fa";
import { FaLinkedinIn } from "react-icons/fa";
import { MdEmail } from "react-icons/md";

interface FooterSectionProps {
  standalone?: boolean;
}

export function FooterSection({ standalone = true }: FooterSectionProps) {
  const content = (
    <div className="relative">
      <FooterOrbitInteraction />

      <div className="relative z-30 mx-auto flex min-h-svh max-w-[1700px] flex-col justify-between gap-12 px-4 py-16 sm:px-5 sm:py-20 lg:gap-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:gap-16">
          <div>
            <h2 className="font-heading max-w-5xl text-[2.6rem] font-black uppercase leading-[1] tracking-wider text-brand sm:text-[4.8rem] lg:text-[7rem]">
              {footerData.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
          </div>

          <div className="space-y-5 border-t border-white/12 pt-6 text-brand lg:border-l lg:border-t-0 lg:pl-8 lg:pt-2">
            <p className="max-w-full text-base leading-[1.45] sm:text-lg">
              {footerData.description}
            </p>
            <p className="text-sm uppercase tracking-[0.22em] text-brand">
              {footerData.locationLabel}
            </p>
            <p className="max-w-full text-sm leading-[1.55] text-brand sm:text-base">
              {footerData.availability}
            </p>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-wrap gap-3">
            {footerData.socialLinks.map((link) => {
              const Icon =
                link.platform === "linkedin"
                  ? FaLinkedinIn
                  : link.platform === "github"
                    ? FaGithub
                    : MdEmail;

              return (
                <a
                  key={link.platform}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                  title={link.label}
                  className="size-6 text-brand transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Icon className="size-5" />
                  <span className="sr-only">{link.label}</span>
                </a>
              );
            })}
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="min-h-28 w-full sm::block hidden" />

            <p className="max-w-full text-sm leading-[1.5] text-brand lg:text-right">
              {footerData.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!standalone) {
    return content;
  }

  return (
    <section
      id="footer"
      className="relative overflow-hidden bg-background text-brand lg:bg-[#150503]"
    >
      <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_top_left,rgba(212,82,31,0.26),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.08),transparent_20%),linear-gradient(180deg,#180604_0%,#0b0908_100%)] lg:block" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30 lg:block" />
      {content}
    </section>
  );
}
