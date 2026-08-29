"use client";

import { useEffect, useState } from "react";

interface RateLimitBannerProps {
  resetAt: Date | null;
  errorMsg: string | null;
}

export function RateLimitBanner({ resetAt, errorMsg }: RateLimitBannerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!resetAt) return;

    const targetTime = new Date(resetAt).getTime();
    
    const updateTime = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0 && targetTime > 0) {
        window.location.reload();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [resetAt]);

  if (!resetAt || timeLeft <= 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
      <div className="flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-orange-400">
            Quota IA temporairement épuisé
          </h3>
          <div className="mt-1 text-sm text-muted-foreground">
            {errorMsg || "L'IA a atteint sa limite de requêtes."}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-orange-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>Reprise possible dans {timeLeft} seconde{timeLeft > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
