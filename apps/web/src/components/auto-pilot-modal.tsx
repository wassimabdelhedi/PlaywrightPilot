"use client";

import React, { useEffect, useState } from "react";
import { StopAutoPilotButton } from "@/components/stop-auto-pilot-button";

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function AutoPilotModal({ isRunning, scenarios, onStop }: { isRunning: boolean; scenarios: any[]; onStop: (formData: FormData) => Promise<void> }) {
  if (!isRunning) return null;

  // Calculs de progression
  const totalScenarios = scenarios.filter(s => s.status !== "REJECTED").length;
  const approvedScenarios = scenarios.filter(s => s.status === "APPROVED").length;
  
  const testCases = scenarios.flatMap(s => s.testCases || []);
  const generationFinishedTests = testCases.filter(tc => ["VALIDATED", "VALIDATION_FAILED", "ACTIVE"].includes(tc.status)).length;
  const validatedTests = testCases.filter(tc => ["VALIDATED", "ACTIVE"].includes(tc.status)).length;
  
  // On compte les tests qui ont au moins une exécution terminée OU qui sont déjà ACTIVE (donc réussis)
  const finishedExecutions = testCases.filter(tc => 
    tc.status === "ACTIVE" || (tc.status === "VALIDATED" && tc.executions?.some((ex: any) => ["PASSED", "FAILED", "TIMEOUT"].includes(ex.status)))
  ).length;

  const phase1Done = totalScenarios > 0 && approvedScenarios >= totalScenarios;
  const phase2Done = phase1Done && generationFinishedTests >= approvedScenarios;
  const phase3Done = phase2Done && finishedExecutions >= (validatedTests > 0 ? validatedTests : 1); 

  useEffect(() => {
    if (phase3Done && isRunning) {
      // Auto-pilot completed, automatically stop it to close the modal
      const formData = new FormData();
      onStop(formData).catch(console.error);
    }
  }, [phase3Done, isRunning, onStop]);

  function getStepIcon(isDone: boolean, isActive: boolean) {
    if (isDone) return <CheckCircleIcon className="h-5 w-5 text-emerald-500" />;
    if (isActive) return <LoaderIcon className="h-5 w-5 text-pink-500 animate-spin" />;
    return <CircleIcon className="h-5 w-5 text-muted-foreground/30" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-card w-full max-w-md rounded-2xl p-8 shadow-2xl border border-border flex flex-col items-center animate-in zoom-in-95 duration-300">
        
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-pink-200 opacity-75"></div>
          <span className="relative text-4xl">🤖</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-foreground text-center">Auto-Pilot en cours</h2>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          L'agent IA orchestre l'ensemble du processus. Veuillez ne pas fermer cette page.
        </p>
        
        <div className="w-full space-y-4">
          {/* Phase 1 : Approbation */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            {getStepIcon(phase1Done, !phase1Done)}
            <div className="flex-1">
              <p className="font-semibold text-sm">Approbation des scenarios</p>
              <p className="text-xs text-muted-foreground">Validation par le chef de projet IA</p>
            </div>
            <div className="text-sm font-bold">{approvedScenarios} / {totalScenarios}</div>
          </div>

          {/* Phase 2 : Generation */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            {getStepIcon(phase2Done, phase1Done && !phase2Done)}
            <div className="flex-1">
              <p className="font-semibold text-sm">Generation du code</p>
              <p className="text-xs text-muted-foreground">L'IA developpe les scripts de test</p>
            </div>
            <div className="text-sm font-bold">{generationFinishedTests} / {approvedScenarios || "-"}</div>
          </div>

          {/* Phase 3 : Execution */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            {getStepIcon(phase3Done, phase2Done && !phase3Done)}
            <div className="flex-1">
              <p className="font-semibold text-sm">Execution des tests</p>
              <p className="text-xs text-muted-foreground">Lancement des navigateurs invisibles</p>
            </div>
            <div className="text-sm font-bold">{finishedExecutions} / {validatedTests || "-"}</div>
          </div>
        </div>
        
        <div className="mt-8 w-full border-t border-border pt-6 flex justify-center">
          <form action={onStop}>
            <StopAutoPilotButton />
          </form>
        </div>
      </div>
    </div>
  );
}