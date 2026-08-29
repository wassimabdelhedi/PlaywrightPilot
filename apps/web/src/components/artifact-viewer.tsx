"use client";

import React, { useState } from "react";

interface Artifact {
  id: string;
  type: "VIDEO" | "TRACE" | "SCREENSHOT" | "LOG";
  storageUrl: string;
}

export function ArtifactViewer({ artifacts }: { artifacts: Artifact[] }) {
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  if (artifacts.length === 0) {
    return <p className="text-sm text-muted">Aucun artefact disponible pour cette exécution.</p>;
  }

  const handleArtifactClick = (e: React.MouseEvent, art: Artifact) => {
    if (art.type === "SCREENSHOT" || art.type === "VIDEO") {
      e.preventDefault();
      setActiveArtifact(art);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {artifacts.map((art) => (
          <a
            key={art.id}
            href={`/api/artifacts/download?path=${encodeURIComponent(art.storageUrl)}`}
            onClick={(e) => handleArtifactClick(e, art)}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group cursor-pointer"
          >
            <div className="p-2 bg-primary/10 rounded text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {art.type === "SCREENSHOT" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              )}
              {art.type === "VIDEO" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              )}
              {art.type === "TRACE" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/><path d="M2 12h20"/><path d="m5 7-3 5 3 5"/><path d="m19 7 3 5-3 5"/></svg>
              )}
              {art.type === "LOG" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">
                {art.type}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {art.type === "SCREENSHOT" || art.type === "VIDEO" ? "Cliquer pour visualiser" : "Cliquer pour télécharger"}
              </p>
            </div>
          </a>
        ))}
      </div>

      {activeArtifact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl max-h-screen p-4 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setActiveArtifact(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Fermer (Echap)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="bg-card rounded-lg overflow-hidden border border-border shadow-2xl relative w-full flex items-center justify-center" style={{ maxHeight: '85vh' }}>
              {activeArtifact.type === "SCREENSHOT" ? (
                <img 
                  src={`/api/artifacts/download?path=${encodeURIComponent(activeArtifact.storageUrl)}`} 
                  alt="Screenshot" 
                  className="max-w-full max-h-[85vh] object-contain"
                />
              ) : (
                <video 
                  src={`/api/artifacts/download?path=${encodeURIComponent(activeArtifact.storageUrl)}`} 
                  controls 
                  autoPlay
                  className="max-w-full max-h-[85vh] object-contain outline-none"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
