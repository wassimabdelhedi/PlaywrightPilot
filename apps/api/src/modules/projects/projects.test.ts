// Test d'intégration : appelle l'app Express réelle via supertest,
// contre une base Postgres de test éphémère (variable DATABASE_URL
// pointée vers une DB "_test" dans le pipeline CI, voir Phase 21).
// On teste le comportement HTTP complet, pas juste la fonction du
// service isolément — les erreurs de validation, de sérialisation ou
// de câblage de route ne se voient qu'à ce niveau.

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@platform/database";
import { createApp } from "../../app";

const app = createApp();

beforeEach(async () => {
  // Isolation entre tests : on nettoie la table avant chaque cas.
  await prisma.project.deleteMany();
});

describe("POST /api/v1/projects", () => {
  it("crée un projet avec des données valides", async () => {
    const res = await request(app).post("/api/v1/projects").send({
      name: "Site e-commerce",
      baseUrl: "https://example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Site e-commerce");
    expect(res.body.data.maxCrawlDepth).toBe(3); // valeur par défaut du schéma Zod
  });

  it("rejette une URL invalide avec une erreur 422 formatée", async () => {
    const res = await request(app).post("/api/v1/projects").send({
      name: "Site invalide",
      baseUrl: "pas-une-url",
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/projects/:id", () => {
  it("renvoie 404 avec l'enveloppe d'erreur standard pour un id inexistant", async () => {
    const res = await request(app).get("/api/v1/projects/clx0000000000000000000000");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/v1/health", () => {
  it("confirme que l'API et Postgres répondent", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });
});
