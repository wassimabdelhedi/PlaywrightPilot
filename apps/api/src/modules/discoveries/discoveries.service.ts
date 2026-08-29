// apps/api/src/modules/discoveries/discoveries.service.ts
//
// Ce service ne fait PAS le crawl lui-même — il crée l'enregistrement
// en base (statut PENDING) et publie un job sur la file. Le crawl
// réel s'exécute dans apps/executor (crawl-orchestrator.ts), un
// processus séparé. C'est la matérialisation concrète de la frontière
// "orchestrateur/API vs exécution" posée dans le diagramme de la
// Phase 1.

import { prisma } from "@platform/database";
import { createDiscoveryQueue } from "@platform/queue";
import { NotFoundError } from "../../lib/errors.js";

const discoveryQueue = createDiscoveryQueue();

export async function startDiscovery(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  const discovery = await prisma.discovery.create({
    data: {
      projectId,
      status: "PENDING",
      maxDepth: project.maxCrawlDepth,
    },
  });

  await discoveryQueue.add("crawl", {
    discoveryId: discovery.id,
    projectId: project.id,
    baseUrl: project.baseUrl,
    maxDepth: project.maxCrawlDepth,
    denylistPaths: project.denylistPaths,
  });

  return discovery;
}

export async function getDiscoveryById(organizationId: string, id: string) {
  const discovery = await prisma.discovery.findFirst({
    where: { id, project: { organizationId } },
  });
  if (!discovery) {
    throw new NotFoundError("Discovery", id);
  }
  return discovery;
}

export async function listDiscoveryPages(organizationId: string, discoveryId: string) {
  await getDiscoveryById(organizationId, discoveryId); // vérifie existence + appartenance

  return prisma.page.findMany({
    where: { discoveryId },
    include: { elements: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listDiscoveriesForProject(organizationId: string, projectId: string) {
  // Vérifie que le projet appartient bien à l'organisation
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return prisma.discovery.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { pages: true } },
    },
  });
}

export async function cancelDiscovery(organizationId: string, discoveryId: string) {
  const discovery = await getDiscoveryById(organizationId, discoveryId);

  if (discovery.status !== "PENDING" && discovery.status !== "RUNNING") {
    throw new Error("Impossible d'annuler un crawl qui n'est pas en cours.");
  }

  return prisma.discovery.update({
    where: { id: discoveryId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });
}

export async function deleteDiscovery(organizationId: string, discoveryId: string) {
  // Check existence and verify organization
  const discovery = await prisma.discovery.findFirst({
    where: { id: discoveryId, project: { organizationId } },
  });

  if (!discovery) {
    throw new NotFoundError("Discovery", discoveryId);
  }

  // Delete via cascade
  await prisma.discovery.delete({ where: { id: discoveryId } });
}
