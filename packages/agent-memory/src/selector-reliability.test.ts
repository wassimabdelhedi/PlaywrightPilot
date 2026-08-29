// packages/agent-memory/src/selector-reliability.test.ts

import { describe, it, expect } from "vitest";
import { isUnreliable } from "./selector-reliability.js";

function content(successCount: number, failureCount: number) {
  return { selector: "#submit", pageUrl: "https://example.com", successCount, failureCount, lastOutcomeAt: "" };
}

describe("isUnreliable", () => {
  it("ne juge pas un sélecteur non fiable sous le volume minimal (moins de 3 exécutions)", () => {
    expect(isUnreliable(content(0, 2))).toBe(false); // 100% d'échec mais seulement 2 essais
  });

  it("juge un sélecteur non fiable au-delà de 30% d'échec avec assez de volume", () => {
    expect(isUnreliable(content(6, 4))).toBe(true); // 40% d'échec sur 10 essais
  });

  it("ne juge pas un sélecteur non fiable sous le seuil de 30%", () => {
    expect(isUnreliable(content(8, 2))).toBe(false); // 20% d'échec sur 10 essais
  });

  it("gère un sélecteur parfaitement fiable", () => {
    expect(isUnreliable(content(20, 0))).toBe(false);
  });
});
