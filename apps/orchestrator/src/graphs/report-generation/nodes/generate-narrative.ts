// apps/orchestrator/src/graphs/report-generation/nodes/generate-narrative.ts
import { z } from "zod";
import { config } from "@platform/config";
import { callStructured } from "../../../llm/client.js";
import { resolveProviderName } from "../../../llm/providers/registry.js";
import type { ReportGenerationStateType } from "../state.js";

const SYSTEM_PROMPT = `Tu es un Analyste QA Senior. Ton rôle est de rédiger le résumé exécutif d'un rapport de tests.
On te fournit une évaluation QUALITATIVE de la situation.

RÈGLE D'OR ABSOLUE :
Tu ne dois JAMAIS citer de chiffre, de pourcentage ou de compte exact (ex: "10 tests", "85%").
Tu dois uniquement utiliser un langage qualitatif (ex: "la majorité", "un taux élevé", "quelques erreurs").
Si tu donnes un chiffre exact, le système échouera.

LIVRABLE :
Rédige un paragraphe de synthèse (3-4 phrases maximum) en français, clair et professionnel, identifiant l'état de santé du projet, les zones de risque, et tes recommandations.
Ne rajoute pas de salutations ni de conclusion générique, va droit au but.`;

export async function generateNarrative(state: ReportGenerationStateType) {
  if (state.stats?.totalExecutions === 0) {
    return { narrativeSummary: "Aucune donnée disponible pour générer un rapport narratif." };
  }

  const userPrompt = `
Bilan qualitatif de la période :
${state.qualitativeStats}

Rédige le résumé exécutif (SANS AUCUN CHIFFRE).
  `.trim();

  const NarrativeSchema = z.object({
    narrative: z.string().describe("Le résumé exécutif du rapport de test, strictement qualitatif, sans aucun chiffre.")
  });

  const provider = resolveProviderName(config.DEFAULT_LLM);
  
  const llmResult = await callStructured(
    NarrativeSchema,
    { systemPrompt: SYSTEM_PROMPT, userPrompt, schemaName: "NarrativeReport" },
    { provider }
  );

  return { narrativeSummary: llmResult.data.narrative.trim() };
}
