import { Navbar } from "@/components/navbar";

export default function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />
      <section className="px-4 pb-20 pt-28 sm:px-5 sm:pt-32">
        <div className="mx-auto max-w-[1700px]">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-foreground/55">
            About
          </p>
          <h1 className="font-heading max-w-4xl text-[2.6rem] font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-[4.8rem] lg:text-[6.4rem]">
            About page
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-[1.5] text-foreground/78 sm:text-lg">
            This route is now ready for dedicated about-page content.
          </p>
        </div>
      </section>
    </main>
  );
}
