// apps/api/src/modules/discoveries/discoveries.test.ts
//
// Tests d'intégration pour le module Discoveries (Phase 7).
//
// Stratégie :
//   - On utilise l'app Express RÉELLE via supertest (même approche que projects.test.ts).
//   - On MOCK @platform/queue pour ne pas dépendre de Redis — la queue est
//     une infrastructure externe, pas la logique métier que l'on teste ici.
//   - On utilise la vraie base Postgres (comme pour les autres tests).
//   - Chaque test génère un utilisateur + organisation + projet propres
//     pour garantir l'isolation multi-tenant.

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { prisma } from "@platform/database";
import { createApp } from "../../app.js";

// ─── Mock de BullMQ / @platform/queue ────────────────────────────────────────
// vi.hoisted() est requis car vi.mock() est hissé en tête du fichier par Vitest.
// Sans ça, `mockQueueAdd` serait dans la dead zone temporelle au moment où
// la factory du mock est exécutée.
const { mockQueueAdd } = vi.hoisted(() => {
  const mockQueueAdd = vi.fn().mockResolvedValue({ id: "mock-job-id" });
  return { mockQueueAdd };
});

vi.mock("@platform/queue", () => ({
  createDiscoveryQueue: () => ({ add: mockQueueAdd }),
  createDiscoveryWorker: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const app = createApp();

async function createTestUser() {
  const org = await prisma.organization.create({
    data: { name: "Test Org", slug: `test-org-${Date.now()}` },
  });
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: `test-${Date.now()}@example.com`,
      passwordHash: "hash_irrelevant_for_tests",
      fullName: "Test User",
      role: "ADMIN",
    },
  });
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "Projet Test",
      baseUrl: "https://example.com",
    },
  });
  return { org, user, project };
}

/** Récupère un token JWT valide pour les routes protégées */
async function loginAndGetToken(email: string): Promise<string> {
  // On crée le compte en BDD directement pour éviter le bcrypt dans les tests
  // et on appelle /auth/login avec un mot de passe qu'on a hashé manuellement
  // → plus simple : on injecte le header Authorization avec un token forgé via
  // l'utilitaire de l'app si disponible, sinon on désactive l'auth dans le test.
  //
  // Pour l'instant on teste les routes sans auth (403 attendu) ET avec auth
  // en appelant d'abord POST /auth/register puis POST /auth/login.
  const registerRes = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "Password123!",
    fullName: "Test User",
    organizationName: "Test Org " + Date.now(),
  });
  if (registerRes.status !== 201) return "";

  const loginRes = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "Password123!",
  });
  return loginRes.body?.data?.accessToken ?? "";
}

// ─── Nettoyage ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  mockQueueAdd.mockClear();
  await prisma.discovery.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/discoveries/project/:projectId", () => {
  it("renvoie 401 si non authentifié", async () => {
    const res = await request(app).post(
      "/api/v1/discoveries/project/cmrv00000000000000000000"
    );
    expect(res.status).toBe(401);
  });

  it("renvoie 404 si le projet n'existe pas", async () => {
    const email = `disc-test-${Date.now()}@test.com`;
    const token = await loginAndGetToken(email);

    const res = await request(app)
      .post("/api/v1/discoveries/project/cmrv00000000000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("crée une discovery PENDING et publie un job sur la queue", async () => {
    const email = `disc-test-${Date.now()}@test.com`;
    const token = await loginAndGetToken(email);

    // Récupère l'org créée pour cet utilisateur
    const user = await prisma.user.findFirst({ where: { email } });
    const project = await prisma.project.create({
      data: {
        organizationId: user!.organizationId,
        name: "Mon Projet",
        baseUrl: "https://example.com",
      },
    });

    const res = await request(app)
      .post(`/api/v1/discoveries/project/${project.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.projectId).toBe(project.id);

    // La queue doit avoir été appelée avec le bon payload
    expect(mockQueueAdd).toHaveBeenCalledOnce();
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "crawl",
      expect.objectContaining({
        discoveryId: res.body.data.id,
        projectId: project.id,
        baseUrl: "https://example.com",
      })
    );
  });
});

describe("GET /api/v1/discoveries/:id", () => {
  it("renvoie 401 si non authentifié", async () => {
    const res = await request(app).get(
      "/api/v1/discoveries/cmrv00000000000000000000"
    );
    expect(res.status).toBe(401);
  });

  it("renvoie 404 pour une discovery inexistante", async () => {
    const email = `disc-test-${Date.now()}@test.com`;
    const token = await loginAndGetToken(email);

    const res = await request(app)
      .get("/api/v1/discoveries/cmrv00000000000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("renvoie la discovery si elle appartient à l'organisation", async () => {
    const email = `disc-test-${Date.now()}@test.com`;
    const token = await loginAndGetToken(email);
    const user = await prisma.user.findFirst({ where: { email } });

    const project = await prisma.project.create({
      data: {
        organizationId: user!.organizationId,
        name: "P1",
        baseUrl: "https://example.com",
      },
    });
    const discovery = await prisma.discovery.create({
      data: { projectId: project.id, status: "RUNNING", maxDepth: 2 },
    });

    const res = await request(app)
      .get(`/api/v1/discoveries/${discovery.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(discovery.id);
    expect(res.body.data.status).toBe("RUNNING");
  });
});

describe("GET /api/v1/discoveries/:id/pages", () => {
  it("renvoie les pages avec leurs éléments DOM", async () => {
    const email = `disc-test-${Date.now()}@test.com`;
    const token = await loginAndGetToken(email);
    const user = await prisma.user.findFirst({ where: { email } });

    const project = await prisma.project.create({
      data: {
        organizationId: user!.organizationId,
        name: "P2",
        baseUrl: "https://example.com",
      },
    });
    const discovery = await prisma.discovery.create({
      data: { projectId: project.id, status: "COMPLETED", maxDepth: 1 },
    });
    const page = await prisma.page.create({
      data: {
        discoveryId: discovery.id,
        url: "https://example.com",
        title: "Home",
        depth: 0,
      },
    });
    await prisma.domElement.create({
      data: {
        pageId: page.id,
        type: "BUTTON",
        selectors: ["button#submit"],
        text: "Submit",
      },
    });

    const res = await request(app)
      .get(`/api/v1/discoveries/${discovery.id}/pages`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].url).toBe("https://example.com");
    expect(res.body.data[0].elements).toHaveLength(1);
    expect(res.body.data[0].elements[0].type).toBe("BUTTON");
  });
});
