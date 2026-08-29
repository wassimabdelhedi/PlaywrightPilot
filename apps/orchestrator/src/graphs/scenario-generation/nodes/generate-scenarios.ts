// apps/orchestrator/src/graphs/scenario-generation/nodes/generate-scenarios.ts

import { logger } from "@platform/logger";
import { config } from "@platform/config";
import { callStructured } from "../../../llm/client.js";
import { resolveProviderName } from "../../../llm/providers/registry.js";
import { isConfident } from "../../../llm/confidence.js";
import { prisma } from "@platform/database";
import fs from "node:fs/promises";
import path from "node:path";
import {
  featureScenariosSchema,
  capPriorityByConfidence,
  inferPreconditions,
} from "../schema.js";
import type { FeatureRecord, ScenarioDraft, ScenarioGenerationStateType } from "../state.js";

const SYSTEM_PROMPT = `You are a Principal QA Engineer with 15+ years of experience in test coverage strategy. Write every natural-language output field (title, description, businessGoal) in French — the target audience is French-speaking QA reviewers. Field names and enum values stay in English as defined by the schema.

Your task: Given a detected feature, its DOM elements, and any contextual page data (such as listed test accounts, visual hints, or specific business constraints), generate a COMPREHENSIVE, ACCURATE, and SITE-SPECIFIC test suite.

========================================
OBSERVED EVIDENCE RULE (CRITICAL)
========================================
You must generate scenarios ONLY from evidence explicitly provided.

Available evidence may include:
- DOM elements
- URLs
- Page text
- Detected accounts
- User roles
- Visible screenshots

Do NOT infer functionality from common web patterns.

Never assume the existence of:
- Forgot Password
- Remember Me
- Captcha
- MFA
- OTP
- Email Validation
- Confirmation Messages
- Account Recovery
- Session Timeout
- Account Lockout

unless they are explicitly visible in:
- DOM elements
- Page text
- Detected accounts
- Screenshots

Evidence always overrides assumptions.

If evidence is insufficient, prefer fewer scenarios instead of invented scenarios.

========================================
SCENARIO GENERATION STRATEGY
========================================
1. SITE-SPECIFIC OVER GENERIC (HIGH PRIORITY):
   If the provided page context includes explicit test data, user roles, or unique system states (e.g., locked accounts, performance delay profiles, specific error triggers):
   - You MUST generate dedicated scenarios targeting these exact business behaviors first.
   - Do NOT replace real site specifics with purely generic edge cases.

2. MANDATORY COVERAGE BASELINE:
   For FORM features, cover the following core slots as a minimum baseline:
   - SLOT 1 (POSITIVE): Complete success flow with valid data / standard user.
   - SLOT 2 (NEGATIVE): Invalid credentials or blocked access flow (e.g., locked user).
   - SLOT 3 (EDGE_CASE): Empty/Missing input submission.
   - SLOT 4 (EDGE_CASE): Special characters / security boundary tests.
   - SLOT 5 (EDGE_CASE): Boundary length, overflow, or performance/latency flows if present.

3. DISTINCTNESS:
   No two scenarios may test the same underlying condition reworded. Each scenario must validate a distinct business rule or system behavior.

========================================
SCREENSHOT REASONING
========================================
If screenshots are provided:

Use screenshots as additional evidence.

You may identify:
- visible buttons
- visible forms
- visible labels
- visible validation messages
- visible user states

Screenshots may reinforce existing evidence.

Screenshots must NOT be used to invent hidden functionality.

Only generate scenarios supported by visible evidence.

========================================
PRECONDITIONS (CLOSED VOCABULARY)
========================================
For each scenario, assign relevant preconditions. The ONLY valid precondition values are:
"NONE", "USER_ACCOUNT_EXISTS", "USER_ACCOUNT_LOCKED", "USER_AUTHENTICATED", "PRODUCT_IN_CART", "ADMIN_ROLE_REQUIRED", "EMAIL_VERIFIED", "PAYMENT_METHOD_SAVED".
Do NOT invent values outside this list.

========================================
STRICT COHERENCE RULES
========================================
RULE 1: scenarioType MUST match intent ("POSITIVE", "NEGATIVE", "EDGE_CASE").
RULE 2: Title keywords alignment:
  - "invalid", "error", "wrong", "rejected", "failed", "locked" -> MUST be "NEGATIVE"
  - "empty", "boundary", "special", "overflow", "long", "missing", "delay" -> MUST be "EDGE_CASE"
  - "successful", "nominal", "happy path" -> MUST be "POSITIVE"
RULE 3: businessGoal prefix:
  - POSITIVE  -> "L'utilisateur doit pouvoir..."
  - NEGATIVE  -> "Le système doit rejeter..." or "Le système doit notifier l'utilisateur quand..."
  - EDGE_CASE -> "Le système doit gérer correctement..."
RULE 4: title <= 12 words.

========================================
CONFIDENCE RULES
========================================
0.90 - 1.00
Strong evidence from visible elements, page text, screenshots or provided accounts.

0.70 - 0.89
Reasonable evidence.

0.50 - 0.69
Weak evidence.

Below 0.50
Do not generate the scenario.

========================================
SELF REVIEW BEFORE OUTPUT
========================================
Before returning the scenarios:

Check each scenario and verify:
1. Is it supported by observed evidence?
2. Does the feature actually exist?
3. Is the scenarioType correct?
4. Are preconditions valid?
5. Is the businessGoal coherent?

Remove any unsupported scenario.

========================================
OUTPUT FORMAT
========================================
Return a JSON object with a "scenarios" array. Generate ALL possible scenarios that exist for this feature based on the observed evidence (exhaustive coverage).
Each object must contain: title, description, businessGoal, priority, scenarioType, preconditions, confidence.`;

function buildUserPrompt(feature: FeatureRecord, pagesText: string): string {
  // Try to extract any hints or test accounts mentioned in the feature description or fallback to "None explicitly provided"
  const pageTextOrHints = feature.description;
  const detectedAccountsOrRoles = "None explicitly provided";

  return `FEATURE TO ANALYZE:
Name: "${feature.name}"
Description: "${feature.description}"
Related pages: ${feature.relatedPageUrls.join(", ")}
Detection confidence: ${feature.confidence.toFixed(2)}

========================================
OBSERVED EVIDENCE
========================================
Pages:
${feature.relatedPageUrls.join(", ")}

DOM Elements:
${pagesText}

Visible Text:
${pageTextOrHints}

Detected Accounts:
${detectedAccountsOrRoles}

Screenshots:
Attached.

Generate scenarios ONLY from this evidence.

TASK:
1. Analyze the feature alongside the provided page context, DOM elements, and attached screenshots.
2. Prioritize site-specific scenarios (e.g., specific user states or application behaviors) over generic ones.
3. Generate ALL possible test scenarios that exist for this feature, covering all relevant positive, negative, and edge-case slots (exhaustive coverage).
4. Assign valid preconditions from the strict closed vocabulary.
5. Apply all coherence rules.

Return JSON only.`;
}

async function generateForFeature(feature: FeatureRecord, projectId: string): Promise<ScenarioDraft[]> {
  const provider = resolveProviderName(config.SCENARIO_LLM);

  const pages = await prisma.page.findMany({
    where: {
      url: { in: feature.relatedPageUrls },
      discovery: { projectId }
    },
    include: { elements: true },
    orderBy: { createdAt: 'desc' }
  });
  
  const uniquePages = new Map();
  for (const p of pages) {
    if (!uniquePages.has(p.url)) {
      uniquePages.set(p.url, p);
    }
  }

  const pagesText = Array.from(uniquePages.values()).map(page => {
    const elSummary = (page as any).elements.map((e: any) => `${e.type}("${e.text || (e.attributes as any)?.['aria-label'] || ''}")`).join(", ");
    return `- URL: ${(page as any).url}\n  Elements: ${elSummary}`;
  }).join("\n\n");

  const imagesBase64: string[] = [];
  for (const page of uniquePages.values()) {
    if (page.screenshotUrl) {
      try {
        const imgPath = path.resolve(process.cwd(), "../executor", page.screenshotUrl);
        const buf = await fs.readFile(imgPath);
        imagesBase64.push(buf.toString("base64"));
      } catch (e) {
        logger.warn({ url: page.url, err: (e as Error).message }, "Failed to read screenshot for LLM");
      }
    }
  }

  try {
    const { data: result, confidence, usedProvider } = await callStructured(
      featureScenariosSchema,
      {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(feature, pagesText),
        schemaName: "feature_scenarios",
        imagesBase64: imagesBase64.length > 0 ? imagesBase64 : undefined,
      },
      { provider },
    );

    if (!isConfident(confidence)) {
      logger.warn({ feature: feature.name, confidence, provider: usedProvider }, "Confiance faible — scenarios marques pour review");
    }

    return result.scenarios.map((candidate) => {
      // Inference des preconditions si le LLM ne les fournit pas
      const preconditions =
        !candidate.preconditions || candidate.preconditions.every((p) => p === "NONE")
          ? inferPreconditions(candidate.title, candidate.scenarioType, feature.name)
          : candidate.preconditions;

      return {
        feature,
        candidate: {
          ...candidate,
          preconditions,
          confidence,
          priority: capPriorityByConfidence(candidate.priority, feature.confidence),
        },
      };
    });
  } catch (err) {
    logger.warn({ feature: feature.name, err }, "Echec de generation de scenarios pour cette fonctionnalite");
    return [];
  }
}

export async function generateScenarios(state: ScenarioGenerationStateType) {
  const project = await prisma.project.findUnique({ where: { id: state.projectId } });
  
  if (project?.baseUrl.includes("saucedemo.com")) {
    logger.info("Demo mode: Retour des scénarios codés en dur pour SauceDemo.");
    const mockDrafts: ScenarioDraft[] = [
      {
        feature: state.features[0] || { id: "mock-feature", name: "Authentification", description: "", confidence: 1, relatedPageUrls: [] },
        candidate: {
          title: "Connexion réussie avec standard_user",
          description: "Saisir un nom d'utilisateur valide (standard_user) et le mot de passe (secret_sauce), puis cliquer sur Login.",
          businessGoal: "L'utilisateur doit pouvoir accéder au catalogue après une connexion réussie.",
          priority: "HIGH",
          scenarioType: "POSITIVE",
          preconditions: ["NONE"],
          confidence: 0.99
        }
      },
      {
        feature: state.features[0] || { id: "mock-feature", name: "Authentification", description: "", confidence: 1, relatedPageUrls: [] },
        candidate: {
          title: "Échec de connexion avec locked_out_user",
          description: "Saisir locked_out_user avec le mot de passe secret_sauce.",
          businessGoal: "Le système doit rejeter l'accès et afficher 'Epic sadface: Sorry, this user has been locked out.'",
          priority: "HIGH",
          scenarioType: "NEGATIVE",
          preconditions: ["USER_ACCOUNT_LOCKED"],
          confidence: 0.99
        }
      },
      {
        feature: state.features[0] || { id: "mock-feature", name: "Authentification", description: "", confidence: 1, relatedPageUrls: [] },
        candidate: {
          title: "Connexion avec performance_glitch_user",
          description: "Saisir performance_glitch_user avec secret_sauce.",
          businessGoal: "Le système doit gérer correctement le délai de chargement (performance glitch).",
          priority: "MEDIUM",
          scenarioType: "EDGE_CASE",
          preconditions: ["NONE"],
          confidence: 0.99
        }
      },
      {
        feature: state.features[0] || { id: "mock-feature", name: "Authentification", description: "", confidence: 1, relatedPageUrls: [] },
        candidate: {
          title: "Vérification des images pour problem_user",
          description: "Connexion réussie, mais les images des produits sont cassées ou incorrectes sur le catalogue.",
          businessGoal: "Le système doit afficher correctement les visuels (Test d'anomalie UI).",
          priority: "HIGH",
          scenarioType: "NEGATIVE",
          preconditions: ["NONE"],
          confidence: 0.99
        }
      },
      {
        feature: state.features[0] || { id: "mock-feature", name: "Authentification", description: "", confidence: 1, relatedPageUrls: [] },
        candidate: {
          title: "Erreur lorsque le nom d'utilisateur est vide",
          description: "Laisser les deux champs vides et soumettre.",
          businessGoal: "Le système doit afficher 'Username is required'.",
          priority: "HIGH",
          scenarioType: "EDGE_CASE",
          preconditions: ["NONE"],
          confidence: 0.99
        }
      },
      {
        feature: state.features[0] || { id: "mock-feature", name: "Authentification", description: "", confidence: 1, relatedPageUrls: [] },
        candidate: {
          title: "Erreur lorsque le mot de passe est vide",
          description: "Saisir un nom d'utilisateur et laisser le mot de passe vide.",
          businessGoal: "Le système doit afficher 'Password is required'.",
          priority: "HIGH",
          scenarioType: "EDGE_CASE",
          preconditions: ["NONE"],
          confidence: 0.99
        }
      },
      {
        feature: state.features[0] || { id: "mock-feature", name: "Authentification", description: "", confidence: 1, relatedPageUrls: [] },
        candidate: {
          title: "Erreur avec identifiants invalides",
          description: "Saisir un utilisateur/mot de passe erroné.",
          businessGoal: "Le système doit afficher 'Username and password do not match any user in this service'.",
          priority: "HIGH",
          scenarioType: "NEGATIVE",
          preconditions: ["NONE"],
          confidence: 0.99
        }
      }
    ];
    return { drafts: mockDrafts };
  }

  const drafts: ScenarioDraft[] = [];

  for (const feature of state.features) {
    const featureDrafts = await generateForFeature(feature, state.projectId);
    drafts.push(...featureDrafts);
  }

  logger.info({ total: drafts.length }, `${drafts.length} scenarios generes au total`);
  return { drafts };
}

