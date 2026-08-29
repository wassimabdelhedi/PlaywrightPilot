const fs = require('fs');
const path = 'c:/Finlogick/PlaywrightPilot/apps/orchestrator/src/graphs/test-generation/step-schema.ts';

const content = import { z } from "zod";

export const testPlanSchema = z.object({
  testTitle: z.string().min(5).max(150),
  targetPageUrl: z.string().min(1).describe("URL complete ou chemin relatif de la page de depart"),
  steps: z.array(z.object({
    action: z.enum(["goto", "click", "fill", "check", "uncheck", "selectOption", "expectVisible", "expectText", "expectURL"]),
    selector: z.string().optional(),
    url: z.string().optional(),
    value: z.string().optional()
  })).min(1).max(25).describe("Liste ordonnee des actions a executer."),
  infeasible: z.boolean().optional(),
  infeasibleReason: z.string().optional(),
  reasoning: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  successCriteria: z.object({
    expectedUrlPattern: z.string().optional().describe("Sous-chaine ou motif attendu dans l'URL apres l'action"),
    visibleElementSelector: z.string().optional().describe("Selecteur CSS d'un element qui doit apparaitre"),
    hiddenElementSelector: z.string().optional().describe("Selecteur CSS d'un element qui doit disparaitre"),
    expectedText: z.string().optional().describe("Texte exact attendu sur la page apres l'action")
  }).describe("Criteres permettant de valider la reussite du scenario")
});

export type TestPlan = z.infer<typeof testPlanSchema>;
;

fs.writeFileSync(path, content);
console.log('step-schema updated');
