"use client";

import { footerData } from "@/data/footer-data";
import { Download, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";

interface FooterSectionProps {
  contentRef?: RefObject<HTMLDivElement | null>;
  standalone?: boolean;
}

export function FooterSection({
  contentRef,
  standalone = true,
}: FooterSectionProps) {
  const content = (
    <div
      ref={contentRef}
      className="relative z-10 mx-auto flex min-h-svh max-w-[1700px] flex-col justify-between gap-12 px-4 py-16 sm:px-5 sm:py-20 lg:gap-16 lg:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:gap-16">
        <div>
          {/* <p className="mb-4 text-xs uppercase tracking-[0.28em] text-brand">
            {footerData.eyebrow}
          </p> */}
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
          {footerData.links.map((link) =>
            link.download ? (
              <a
                key={link.href}
                href={link.href}
                download
                className="inline-flex items-center gap-2 border border-brand/14 bg-brand/6 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand transition-colors duration-200 hover:border-brand/30 hover:bg-brand/10"
              >
                {link.label}
                <Download className="h-4 w-4" strokeWidth={2.3} />
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 border border-brand/14 bg-brand/6 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand transition-colors duration-200 hover:border-brand/30 hover:bg-brand/10"
              >
                {link.label}
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.3} />
              </Link>
            ),
          )}
        </div>

        <p className="max-w-full text-sm leading-[1.5] text-white/40 lg:text-right">
          {footerData.note}
        </p>
      </div>
    </div>
  );

  if (!standalone) {
    return content;
  }

  return (
    <section
      id="footer"
      className="relative overflow-hidden bg-[#150503] text-brand"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,82,31,0.26),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.08),transparent_20%),linear-gradient(180deg,#180604_0%,#0b0908_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30" />
      {content}
    </section>
  );
}
