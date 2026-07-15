import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <Link href="/projects" className="font-display font-bold text-xl text-foreground">
          PlaywrightPilot
        </Link>
        <a 
          href="/api/auth/logout" 
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Déconnexion
        </a>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>
    </div>
  );
}
