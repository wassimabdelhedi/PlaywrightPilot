// packages/queue/src/index.ts
//
// Point unique de définition des files BullMQ. apps/api PRODUIT des
// jobs (ex: après création d'une Discovery), apps/executor les
// CONSOMME. Les deux importent ce fichier pour garantir qu'ils
// s'accordent sur le nom de la file et la forme du payload — sans ça,
// un renommage d'un côté silencieusement désynchronisé de l'autre.

import { Queue, Worker, type Job, type Processor } from "bullmq";
import { config } from "@platform/config";

export const QUEUE_NAMES = {
  DISCOVERY: "discovery",
  FEATURE_UNDERSTANDING: "feature-understanding",
  SCENARIO_GENERATION: "scenario-generation",
  TEST_GENERATION: "test-generation",
  EXECUTION: "execution",
  FAILURE_ANALYSIS: "failure-analysis",
  REPORT_GENERATION: "report-generation",
} as const;

export interface DiscoveryJobPayload {
  discoveryId: string;
  projectId: string;
  baseUrl: string;
  maxDepth: number;
  denylistPaths: string[];
}

const connection = { url: config.REDIS_URL };

export function createDiscoveryQueue(): Queue<DiscoveryJobPayload> {
  return new Queue<DiscoveryJobPayload>(QUEUE_NAMES.DISCOVERY, { connection });
}

export function createDiscoveryWorker(
  processor: Processor<DiscoveryJobPayload>
): Worker<DiscoveryJobPayload> {
  return new Worker<DiscoveryJobPayload>(QUEUE_NAMES.DISCOVERY, processor, {
    connection,
    concurrency: 2, // boré : chaque job ouvre déjà plusieurs pages en interne
  });
}

export interface FeatureUnderstandingJobPayload {
  discoveryId: string;
  projectId: string;
}

export function createFeatureUnderstandingQueue(): Queue<FeatureUnderstandingJobPayload> {
  return new Queue<FeatureUnderstandingJobPayload>(QUEUE_NAMES.FEATURE_UNDERSTANDING, { connection });
}

export function createFeatureUnderstandingWorker(
  processor: Processor<FeatureUnderstandingJobPayload>
): Worker<FeatureUnderstandingJobPayload> {
  return new Worker<FeatureUnderstandingJobPayload>(QUEUE_NAMES.FEATURE_UNDERSTANDING, processor, {
    connection,
    concurrency: 1, // Limité à 1 car l'IA est gourmande
  });
}

export interface ScenarioGenerationJobPayload {
  projectId: string;
}

export function createScenarioGenerationQueue(): Queue<ScenarioGenerationJobPayload> {
  return new Queue<ScenarioGenerationJobPayload>(QUEUE_NAMES.SCENARIO_GENERATION, { connection });
}

export function createScenarioGenerationWorker(
  processor: Processor<ScenarioGenerationJobPayload>
): Worker<ScenarioGenerationJobPayload> {
  return new Worker<ScenarioGenerationJobPayload>(QUEUE_NAMES.SCENARIO_GENERATION, processor, {
    connection,
    concurrency: 1, // la génération IA est CPU-intensive, on limite à 1 job simultané
  });
}

export interface TestGenerationJobPayload {
  scenarioId: string;
}

export function createTestGenerationQueue(): Queue<TestGenerationJobPayload> {
  return new Queue<TestGenerationJobPayload>(QUEUE_NAMES.TEST_GENERATION, { connection });
}

export function createTestGenerationWorker(
  processor: Processor<TestGenerationJobPayload>
): Worker<TestGenerationJobPayload> {
  return new Worker<TestGenerationJobPayload>(QUEUE_NAMES.TEST_GENERATION, processor, {
    connection,
    concurrency: 1,
  });
}

export type { Job };

export interface ExecutionJobPayload {
  executionId: string;
}

export function createExecutionQueue(): Queue<ExecutionJobPayload> {
  return new Queue<ExecutionJobPayload>(QUEUE_NAMES.EXECUTION, { connection });
}

export function createExecutionWorker(
  processor: Processor<ExecutionJobPayload>
): Worker<ExecutionJobPayload> {
  return new Worker<ExecutionJobPayload>(QUEUE_NAMES.EXECUTION, processor, {
    connection,
    concurrency: 2,
  });
}

export interface FailureAnalysisJobPayload {
  executionId: string;
}

export function createFailureAnalysisQueue(): Queue<FailureAnalysisJobPayload> {
  return new Queue<FailureAnalysisJobPayload>(QUEUE_NAMES.FAILURE_ANALYSIS, { connection });
}

export function createFailureAnalysisWorker(
  processor: Processor<FailureAnalysisJobPayload>
): Worker<FailureAnalysisJobPayload> {
  return new Worker<FailureAnalysisJobPayload>(QUEUE_NAMES.FAILURE_ANALYSIS, processor, {
    connection,
    concurrency: 1, // LLM processing
  });
}

export interface ReportGenerationJobPayload {
  projectId: string;
}

export function createReportGenerationQueue(): Queue<ReportGenerationJobPayload> {
  return new Queue<ReportGenerationJobPayload>(QUEUE_NAMES.REPORT_GENERATION, { connection });
}

export function createReportGenerationWorker(
  processor: Processor<ReportGenerationJobPayload>
): Worker<ReportGenerationJobPayload> {
  return new Worker<ReportGenerationJobPayload>(QUEUE_NAMES.REPORT_GENERATION, processor, {
    connection,
    concurrency: 1,
  });
}

