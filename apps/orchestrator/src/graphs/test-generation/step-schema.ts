import { z } from "zod";

export const testPlanSchema = z.object({
  testTitle: z.string().min(5).max(150),
  targetPageUrl: z.string().min(1).describe("URL complete ou chemin relatif de la page de depart"),
  steps: z.array(z.object({
    action: z.enum(["goto", "click", "fill", "check", "uncheck", "selectOption", "expectVisible", "expectText", "expectURL"]),
    selector: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    value: z.string().nullable().optional()
  })).min(1).max(25).describe("Liste ordonnee des actions a executer."),
  infeasible: z.boolean().nullable().optional(),
  infeasibleReason: z.string().nullable().optional(),
  reasoning: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  successCriteria: z.object({
    expectedUrlPattern: z.string().nullable().optional().describe("Sous-chaine ou motif attendu dans l'URL apres l'action"),
    visibleElementSelector: z.string().nullable().optional().describe("Selecteur CSS d'un element qui doit apparaitre"),
    hiddenElementSelector: z.string().nullable().optional().describe("Selecteur CSS d'un element qui doit disparaitre"),
    expectedText: z.string().nullable().optional().describe("Texte exact attendu sur la page apres l'action")
  }).describe("Criteres permettant de valider la reussite du scenario")
});

export type TestPlan = z.infer<typeof testPlanSchema>;
