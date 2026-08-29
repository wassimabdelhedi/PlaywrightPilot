// packages/agent-memory/src/index.ts

export { upsertMemory, queryMemory, hasFreshMemory, listMemoriesByCategory, type MemoryCategory } from "./memory-service.js";
export { recordSelectorOutcome, isUnreliable } from "./selector-reliability.js";
export { embedText } from "./embeddings.js";

