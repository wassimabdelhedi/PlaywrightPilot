"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export function StopAutoPilotButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit"
      variant="danger"
      className="gap-2 shadow-lg hover:shadow-red-500/25 transition-all"
      disabled={disabled || pending}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      </svg>
      {pending ? "Arrêt..." : "Arrêter Auto-Pilot"}
    </Button>
  );
}