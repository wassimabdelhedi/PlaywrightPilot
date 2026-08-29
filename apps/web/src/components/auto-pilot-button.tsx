"use client";

import { useFormStatus } from "react-dom";

export function AutoPilotButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 shadow-md ${
        disabled
          ? "bg-pink-400 cursor-not-allowed opacity-50"
          : pending
          ? "bg-pink-500 cursor-wait opacity-80"
          : "bg-pink-600 hover:bg-pink-500"
      }`}
      title={disabled ? "Aucun scenario disponible" : "Approuve, genere le code et lance l'execution de tous les scenarios brouillons automatiquement !"}
    >
      {pending ? (
        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <span className="text-lg leading-none">🚀</span>
      )}
      {pending ? "Lancement en arriere-plan..." : "Auto-Pilot : Tout GAcnAcrer & ExAcuter"}
    </button>
  );
}