import { WorksPageShowcase } from "@/app/work/_components/works-page-showcase";
import { Navbar } from "@/components/navbar";

export default function WorksPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />
      <WorksPageShowcase />
    </main>
  );
}
