"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface ProjectNavigationProps {
  projectId: string;
}

export function ProjectNavigation({ projectId }: ProjectNavigationProps) {
  const pathname = usePathname();

  const tabs = [
    { name: "Dashboard", href: `/projects/${projectId}` },
    { name: "Scénarios", href: `/projects/${projectId}/scenarios` },
    { name: "Exécutions", href: `/projects/${projectId}/executions` },
  ];

  return (
    <nav className="flex space-x-8 border-b border-border mb-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:border-muted-foreground hover:text-foreground"
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
