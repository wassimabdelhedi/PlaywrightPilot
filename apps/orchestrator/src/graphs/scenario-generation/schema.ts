// apps/orchestrator/src/graphs/scenario-generation/schema.ts

import { z } from "zod";

export const priorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export type Priority = z.infer<typeof priorityEnum>;

export const scenarioTypeEnum = z.enum(["POSITIVE", "NEGATIVE", "EDGE_CASE"]);
export type ScenarioType = z.infer<typeof scenarioTypeEnum>;

/**
 * Preconditions metier que le systeme doit satisfaire avant d executer ce scenario.
 * Exemples : "USER_ACCOUNT_EXISTS", "USER_AUTHENTICATED", "PRODUCT_IN_CART"
 */
export const preconditionEnum = z.enum([
  "NONE",
  "USER_ACCOUNT_EXISTS",
  "USER_AUTHENTICATED",
  "PRODUCT_IN_CART",
  "ADMIN_ROLE_REQUIRED",
  "EMAIL_VERIFIED",
  "PAYMENT_METHOD_SAVED",
]);
export type Precondition = z.infer<typeof preconditionEnum>;

export const scenarioCandidateSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(600),
  businessGoal: z.string().min(10).max(300),
  priority: priorityEnum,
  scenarioType: scenarioTypeEnum,
  /**
   * Preconditions requises pour executer ce scenario.
   * Le plan de test devra commencer par satisfaire ces preconditions.
   * Ex: ["USER_ACCOUNT_EXISTS"] -> le plan commencera par verifier ou creer un compte
   */
  preconditions: z.array(preconditionEnum).default(["NONE"]),
  /**
   * Score de confiance 0-1 retourne par le LLM provider.
   * < 0.8 : marque pour review humaine avant execution.
   */
  confidence: z.number().min(0).max(1).default(1.0),
});

export const featureScenariosSchema = z.object({
  scenarios: z.array(scenarioCandidateSchema).min(1).max(30),
});

export type ScenarioCandidate = z.infer<typeof scenarioCandidateSchema>;

const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

// Plafonne la priorite proposee par le LLM selon la confiance de la
// fonctionnalite source (Phase 8). Un jugement subjectif du modele ne
// doit jamais depasser ce que le signal objectif de confiance autorise.
export function capPriorityByConfidence(priority: Priority, confidence: number): Priority {
  const maxAllowed: Priority =
    confidence >= 0.75 ? "CRITICAL" : confidence >= 0.5 ? "HIGH" : confidence >= 0.3 ? "MEDIUM" : "LOW";

  return PRIORITY_RANK[priority] > PRIORITY_RANK[maxAllowed] ? maxAllowed : priority;
}

/**
 * Infere les preconditions a partir du nom et type d un scenario.
 * Utilise si le LLM ne les fournit pas ou fournit ["NONE"].
 */
export function inferPreconditions(
  scenarioTitle: string,
  scenarioType: ScenarioType,
  featureName: string,
): Precondition[] {
  const combined = `${scenarioTitle} ${featureName}`.toLowerCase();

  if (
    combined.includes("checkout") ||
    combined.includes("order") ||
    combined.includes("payment")
  ) {
    return ["USER_AUTHENTICATED", "PRODUCT_IN_CART"];
  }

  if (
    combined.includes("login") ||
    combined.includes("sign in") ||
    combined.includes("connexion")
  ) {
    return scenarioType === "POSITIVE" ? ["USER_ACCOUNT_EXISTS"] : ["USER_ACCOUNT_EXISTS"];
  }

  if (combined.includes("register") || combined.includes("sign up") || combined.includes("inscription")) {
    return ["NONE"]; // Pas de precondition pour un nouveau compte
  }

  if (combined.includes("profile") || combined.includes("account") || combined.includes("settings")) {
    return ["USER_AUTHENTICATED"];
  }

  if (combined.includes("admin") || combined.includes("dashboard")) {
    return ["USER_AUTHENTICATED", "ADMIN_ROLE_REQUIRED"];
  }

  return ["NONE"];
}

