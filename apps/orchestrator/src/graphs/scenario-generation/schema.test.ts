// apps/orchestrator/src/graphs/scenario-generation/schema.test.ts

import { describe, it, expect } from "vitest";
import { capPriorityByConfidence } from "./schema.js";

describe("capPriorityByConfidence", () => {
  it("laisse CRITICAL inchangé si la confiance est élevée", () => {
    expect(capPriorityByConfidence("CRITICAL", 0.9)).toBe("CRITICAL");
  });

  it("plafonne CRITICAL à MEDIUM si la confiance est faible", () => {
    expect(capPriorityByConfidence("CRITICAL", 0.4)).toBe("MEDIUM");
  });

  it("plafonne CRITICAL à LOW si la confiance est très faible", () => {
    expect(capPriorityByConfidence("CRITICAL", 0.1)).toBe("LOW");
  });

  it("ne relève jamais une priorité déjà inférieure au plafond", () => {
    expect(capPriorityByConfidence("LOW", 0.95)).toBe("LOW");
  });

  it("plafonne HIGH à MEDIUM sous le seuil de 0.5", () => {
    expect(capPriorityByConfidence("HIGH", 0.45)).toBe("MEDIUM");
  });
});
