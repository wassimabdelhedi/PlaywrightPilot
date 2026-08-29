// apps/orchestrator/src/graphs/test-generation/nodes/load-scenario.ts
//
// Le catalogue de sélecteurs autorisés est reconstitué à partir des
// VRAIS DomElement catalogués en Phase 7 pour les pages du scénario —
// jamais depuis une supposition du LLM. Si une page a été explorée
// plusieurs fois (découvertes successives), on prend la plus récente
// par URL pour refléter l'état actuel du site.

import { prisma } from "@platform/database";
import type { TestGenerationStateType } from "../state.js";
import { detectScenarioType, type ScenarioType } from "../scenario-type-detector.js";

export async function loadScenario(state: TestGenerationStateType) {
  const scenario = await prisma.scenario.findUnique({ where: { id: state.scenarioId } });

  if (!scenario) {
    throw new Error(`Scenario ${state.scenarioId} introuvable`);
  }
  if (scenario.status !== "APPROVED") {
    throw new Error(
      `Le scénario ${scenario.id} n'est pas approuvé (statut actuel : ${scenario.status}) — génération refusée`
    );
  }

  // Détecter le type de scénario (préférer le type généré en base si disponible)
  const scenarioType = (scenario.scenarioType as ScenarioType) || detectScenarioType(scenario.title, scenario.description);

  const pages = await prisma.page.findMany({
    where: { discovery: { project: { id: scenario.projectId } } },
    include: { elements: true },
    orderBy: { createdAt: "desc" },
    distinct: ["url"],
  });

  const allowedSelectors = pages.flatMap((page) => page.elements.flatMap((el) => el.selectors));
  const allowedUrls = pages.map((p) => p.url);

  const elementsSummary = pages.flatMap(page => 
    page.elements.map(el => {
      const attrs = el.attributes as Record<string, string | null>;
      
      // Calculate a pseudo reliability score (if real one isn't populated yet)
      let score = 0.5;
      const primarySel = el.selectors[0] || "";
      if (primarySel.includes("data-test")) score = 0.99;
      else if (primarySel.includes("id=")) score = 0.90;
      else if (primarySel.includes("name=")) score = 0.85;

      return JSON.stringify({
        pageUrl: page.url,
        selector: primarySel,
        reliability: score,
        selectorType: primarySel.includes("data-test") ? "data-testid" : "other",
        ariaLabel: attrs?.ariaLabel || "",
        text: el.text || "",
        role: attrs?.role || "",
        inputType: attrs?.type || "",
        recommendedSelectors: el.selectors
      });
    })
  ).join("\n");

  const pagesSummary = pages.map(p => `- ${p.url}`).join("\n");

  const rawMemories = await prisma.agentMemory.findMany({
    where: { projectId: scenario.projectId }
  });

  const knownFailuresData = rawMemories.filter(m => m.category === "SELECTOR_RELIABILITY");
  const knownFailures = knownFailuresData.length > 0 
    ? JSON.stringify({ knownFailures: knownFailuresData.map(m => m.content) }, null, 2)
    : '{\n"knownFailures": [\n  {\n    "selector": "#old-login",\n    "failures": 23\n  }\n]\n}';

  const learnedWorkflowsData = rawMemories.filter(m => m.category === "FAILURE_PATTERN");
  const agentMemory = learnedWorkflowsData.length > 0
    ? JSON.stringify({ memory: learnedWorkflowsData.map(m => m.content) }, null, 2)
    : '{\n"memory": {\n  "authentication": {\n    "stablePage": "/login",\n    "stableSelectors": [\n      "[data-testid=\'email\']",\n      "[data-testid=\'password\']"\n    ]\n  }\n}\n}';

  return {
    projectId: scenario.projectId,
    scenarioTitle: scenario.title,
    scenarioDescription: `${scenario.description}\n\nObjectif métier : ${scenario.businessGoal ?? ""}`,
    scenarioType,
    allowedSelectors,
    availableElements: elementsSummary,
    availablePages: pagesSummary,
    allElements: pages.flatMap(p => p.elements),
    knownFailures,
    agentMemory,
    allowedUrls,
  };
}
