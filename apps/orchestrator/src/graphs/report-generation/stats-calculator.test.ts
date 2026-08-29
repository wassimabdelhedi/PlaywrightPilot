// apps/orchestrator/src/graphs/report-generation/stats-calculator.test.ts
import { describe, it, expect } from "vitest";
import { calculateStats, translateToQualitative } from "./stats-calculator.js";

describe("stats-calculator", () => {
  it("should handle empty executions list", () => {
    const stats = calculateStats([]);
    expect(stats.totalExecutions).toBe(0);
    expect(stats.successRate).toBe(0);
    
    const text = translateToQualitative(stats);
    expect(text).toContain("Aucune exécution terminée");
  });

  it("should calculate success rate and exclude non-terminal statuses", () => {
    const executions = [
      { status: "SUCCESS" },
      { status: "SUCCESS" },
      { status: "FAILED" },
      { status: "RUNNING" }, // should be ignored
      { status: "PENDING" }, // should be ignored
    ];
    
    const stats = calculateStats(executions);
    expect(stats.totalExecutions).toBe(3);
    expect(stats.passedCount).toBe(2);
    expect(stats.failedCount).toBe(1);
    expect(stats.successRate).toBeCloseTo(66.67);
    
    const text = translateToQualitative(stats);
    expect(text).toContain("Moyen");
  });

  it("should group failure classifications", () => {
    const executions = [
      { status: "FAILED", classification: "UI_BUG" },
      { status: "FAILED", classification: "UI_BUG" },
      { status: "FAILED", classification: "NETWORK_ERROR" },
    ];
    
    const stats = calculateStats(executions);
    expect(stats.failureClassifications).toEqual({
      UI_BUG: 2,
      NETWORK_ERROR: 1,
    });
    
    const text = translateToQualitative(stats);
    expect(text).toContain("UI_BUG, NETWORK_ERROR");
  });

  it("should extract top 5 failing tests", () => {
    const executions = [
      { status: "FAILED", testCaseId: "t1", testCase: { scenario: { title: "Login" } } },
      { status: "FAILED", testCaseId: "t1", testCase: { scenario: { title: "Login" } } },
      { status: "FAILED", testCaseId: "t2", testCase: { scenario: { title: "Cart" } } },
      { status: "FAILED", testCaseId: "t3", testCase: { scenario: { title: "Checkout" } } },
      { status: "FAILED", testCaseId: "t4", testCase: { scenario: { title: "Profile" } } },
      { status: "FAILED", testCaseId: "t5", testCase: { scenario: { title: "Search" } } },
      { status: "FAILED", testCaseId: "t6", testCase: { scenario: { title: "Filter" } } },
    ];
    
    const stats = calculateStats(executions);
    expect(stats.topFailingTests).toHaveLength(5);
    expect(stats.topFailingTests[0].testId).toBe("t1");
    expect(stats.topFailingTests[0].failures).toBe(2);
  });
});
