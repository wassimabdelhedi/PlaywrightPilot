"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";

export function GenerateScenariosButton({
  disabled,
  scenarioCount,
  isGenerating = false,
}: {
  disabled: boolean;
  scenarioCount: number;
  isGenerating?: boolean;
}) {
  const { pending } = useFormStatus();

  const loading = pending || isGenerating;

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
        disabled
          ? "bg-indigo-400 cursor-not-allowed opacity-50"
          : loading
          ? "bg-indigo-500 cursor-wait opacity-80"
          : "bg-indigo-600 hover:bg-indigo-500"
      }`}
      title={disabled ? "Attendez la fin de l'extraction de fonctionnalités (crawling) pour générer des scénarios" : ""}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )}
      {loading ? "Génération en cours..." : "Générer Scénarios (IA)"}
    </button>
  );
}
