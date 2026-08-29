// Logique métier pure. AUCUNE référence à Express ici (pas de req/res) —
// c'est ce qui permettra à l'orchestrateur LangGraph (Phase 8+)
// d'importer directement `createProject` ou `getProjectById` sans
// passer par une requête HTTP interne.
//
// Note Phase 3 : `organizationId` est reçu en paramètre explicite pour
// l'instant. À partir de la Phase 4, il proviendra du middleware
// d'authentification (req.user.organizationId) — la signature de ces
// fonctions ne changera pas, seul l'appelant (le contrôleur) changera.

import { prisma } from "@platform/database";
import { createScenarioGenerationQueue } from "@platform/queue";
import { NotFoundError } from "../../lib/errors.js";
import type { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from "./projects.schema.js";

const scenarioQueue = createScenarioGenerationQueue();

export async function createProject(organizationId: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: { organizationId, ...input },
  });
}

export async function listProjects(organizationId: string, query: ListProjectsQuery) {
  const where = { organizationId, ...(query.status ? { status: query.status } : {}) };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getProjectById(organizationId: string, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    include: {
      _count: {
        select: {
          memories: {
            where: { category: "FEATURE_MAP" },
          },
        },
      },
    },
  });

  // Recherche par id ET organizationId dans la même requête — jamais
  // deux requêtes séparées ("trouver puis vérifier l'org"), ce qui
  // créerait une fenêtre d'accès inter-tenant exploitable.
  if (!project) {
    throw new NotFoundError("Project", id);
  }

  // Vérifier si une génération de scénarios est en cours
  const activeJobs = await scenarioQueue.getJobs(["waiting", "active", "delayed"]);
  const isGeneratingScenarios = activeJobs.some((job) => job.data?.projectId === id);

  return { ...project, isGeneratingScenarios };
}

export async function updateProject(organizationId: string, id: string, input: UpdateProjectInput) {
  await getProjectById(organizationId, id); // vérifie existence + appartenance

  return prisma.project.update({ where: { id }, data: input });
}

export async function deleteProject(organizationId: string, id: string) {
  await getProjectById(organizationId, id);

  await prisma.project.delete({ where: { id } });
}

import { spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runAutopilot(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });

  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  // Marquer immediatement les scenarios DRAFT comme APPROVED 
  // pour que le frontend affiche la modale (isAutoPilotRunning) des le rechargement
  await prisma.scenario.updateMany({
    where: { projectId, status: "DRAFT" },
    data: { status: "APPROVED" }
  });

  // Lancement du script Node en arriere-plan
  const rootDir = path.resolve(__dirname, "../../../../..");
  const scriptPath = path.join(rootDir, "apps/executor/src/examples/run-all-project-tests.ts");

  const tsxCli = path.join(rootDir, "apps/executor/node_modules/tsx/dist/cli.mjs");
  const command = `node --env-file=apps/api/.env "${tsxCli}" "${scriptPath}" "${projectId}" >> autopilot.log 2>&1`;
  
  const { exec } = await import("node:child_process");
  const child = exec(command, { cwd: rootDir });

  child.on("error", (err) => {
    console.error("Erreur de lancement de l'Auto-Pilot :", err);
  });

  child.unref(); // Permet a l'API de ne pas attendre le script
}
export async function stopAutopilot(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId }
  });
  if (!project) throw new Error("Projet introuvable");

  // 1. Repasser les scenarios approuves en DRAFT
  await prisma.scenario.updateMany({
    where: { projectId, status: 'APPROVED' },
    data: { status: 'DRAFT' }
  });

  // 2. Annuler les executions en attente
  await prisma.execution.updateMany({
    where: { 
      status: 'QUEUED',
      testCase: { scenario: { projectId } }
    },
    data: { 
      status: 'FAILED', 
      errorMessage: "Annule par l'utilisateur" 
    }
  });

  // 3. Vider la file d'attente de génération de tests pour éviter les erreurs "DRAFT"
  const { createTestGenerationQueue } = await import("@platform/queue");
  const testQueue = createTestGenerationQueue();
  await testQueue.obliterate({ force: true });
  await testQueue.close();

  // 4. Libérer les tests bloqués en "GENERATED" (puisque la file vient d'être vidée, ils ne seront jamais traités)
  await prisma.testCase.updateMany({
    where: { status: 'GENERATED', scenario: { projectId } },
    data: { status: 'VALIDATION_FAILED', sourceCode: '// Génération annulée par l\'arrêt de l\'Auto-Pilot' }
  });
}
