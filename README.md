# PlaywrightPilot

**AI-powered end-to-end test generation and execution platform built on Playwright.**

PlaywrightPilot autonomously discovers web application features, generates meaningful test scenarios, writes Playwright test code, executes tests, and analyzes failures -- all driven by LLM-based intelligence with minimal human intervention.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [LLM Provider Support](#llm-provider-support)
- [Infrastructure](#infrastructure)
- [Testing](#testing)
- [License](#license)

---

## Overview

PlaywrightPilot is an autonomous QA platform that replaces the traditional, labor-intensive process of writing and maintaining end-to-end tests. Given only a base URL, the system crawls the target application, builds a semantic understanding of its features using LLM analysis, generates prioritized test scenarios, writes executable Playwright test code, runs the tests in isolated browser contexts, and produces actionable failure analysis reports.

The platform operates as a fully automated pipeline orchestrated through an event-driven queue system:

```
Discovery --> Feature Understanding --> Scenario Generation --> Test Generation --> Execution --> Failure Analysis --> Reporting
```

An **AutoPilot** mode chains all these stages end-to-end, allowing users to go from a URL to a full test suite and quality report with a single click.

---

## Key Features

**Autonomous Web Discovery**
- BFS-based crawler with configurable depth and page limits
- Automatic DOM element classification (buttons, forms, links, inputs, modals, tables)
- Multi-selector strategy generation for resilient test targeting
- SSRF protection guard on every followed link
- Heuristic auto-login for authenticated areas

**AI-Driven Feature Understanding**
- LLM-powered analysis of discovered pages and DOM structures
- Semantic feature mapping stored as vector embeddings in PostgreSQL (pgvector)
- Deduplication via cosine similarity to prevent redundant analysis
- Freshness-aware caching to skip expensive re-analysis

**Intelligent Scenario Generation**
- Business-goal-oriented test scenario creation
- Priority classification (Critical, High, Medium, Low)
- Scenario type detection for targeted test strategies

**Automated Test Code Generation**
- LLM-generated Playwright test code with structured validation
- Multi-step generation pipeline: plan, self-check, validate, persist
- Bounded retry loop with automatic fallback on validation failures
- Business consistency validation and assertion building

**Robust Test Execution**
- Isolated Playwright browser contexts per execution
- Automatic artifact collection: screenshots, videos, traces, console logs, HAR files
- Configurable timeouts with hard enforcement
- Failure screenshots captured at the exact moment of crash

**AI Failure Analysis**
- Root cause classification: Site Defect, Stale Test, Flaky Environment, Unknown
- Severity assessment (Blocker, Critical, Major, Minor, Info)
- Self-healing suggestions with alternative selectors
- Regression flag detection

**Selector Reliability Tracking**
- Continuous learning from test execution outcomes
- Per-selector success/failure rate tracking via agent memory
- Feeds back into test generation for more resilient selectors

**Dashboard and Reporting**
- Next.js web dashboard with real-time project monitoring
- KPI cards: success rate, failure rate, defect count, flaky test count
- Visual charts for execution trends and failure classification breakdown
- LLM-generated natural language report summaries
- Full authentication system (JWT + refresh tokens)

---

## Architecture

PlaywrightPilot follows a **microservice-oriented monorepo** architecture with clear separation of concerns:

```
                    +-------------------+
                    |    Web Dashboard  |    (Next.js)
                    |   apps/web        |
                    +--------+----------+
                             |
                             | HTTP
                             v
                    +-------------------+
                    |    REST API       |    (Express.js)
                    |   apps/api        |
                    +--------+----------+
                             |
                    +--------+----------+
                    |   Redis (BullMQ)  |    Job Queue
                    +--------+----------+
                       /            \
                      v              v
          +----------------+   +------------------+
          |   Executor     |   |   Orchestrator   |
          |  apps/executor |   | apps/orchestrator|
          +----------------+   +------------------+
          | - Discovery    |   | - Feature Graphs |
          | - Crawling     |   | - Scenario Gen   |
          | - Test Running |   | - Test Gen       |
          | - Artifacts    |   | - Failure        |
          +-------+--------+   |   Analysis       |
                  |            | - Report Gen     |
                  v            +--------+---------+
          +----------------+            |
          |   Playwright   |            v
          |   (Chromium)   |   +------------------+
          +----------------+   | LLM Providers    |
                               | - Gemini         |
                               | - OpenAI (GPT)   |
                               | - Claude         |
                               | - Ollama (local) |
                               +------------------+
                    +-------------------+
                    |   PostgreSQL      |
                    |   + pgvector      |
                    +-------------------+
```

### Core Applications

| Application | Path | Role |
|---|---|---|
| **API** | `apps/api` | Express.js REST API. Handles authentication, project CRUD, and job dispatching. |
| **Web** | `apps/web` | Next.js dashboard. Project management, monitoring, and reporting UI. |
| **Executor** | `apps/executor` | Runs Playwright browser sessions for discovery crawling and test execution. |
| **Orchestrator** | `apps/orchestrator` | Hosts LangGraph-based AI workflows for feature analysis, scenario/test generation, failure analysis, and report generation. |

### Shared Packages

| Package | Path | Purpose |
|---|---|---|
| **@platform/database** | `packages/database` | Prisma ORM client, schema, and migrations (PostgreSQL + pgvector). |
| **@platform/queue** | `packages/queue` | BullMQ queue definitions and typed job payloads for all pipeline stages. |
| **@platform/config** | `packages/config` | Centralized Zod-validated environment configuration. Single source of truth for all env vars. |
| **@platform/logger** | `packages/logger` | Structured logging (Pino-based). |
| **@platform/agent-memory** | `packages/agent-memory` | Vector-based agent memory service: embedding storage, semantic deduplication, and similarity search via pgvector. |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (ES Modules) |
| Monorepo | pnpm workspaces + Turborepo |
| API Server | Express.js with Helmet, CORS, rate limiting, compression |
| Web Frontend | Next.js 14 (App Router), React 18, TailwindCSS, Recharts, TanStack Query |
| Browser Automation | Playwright (Chromium) |
| AI Orchestration | LangChain + LangGraph (state machine workflows) |
| LLM Providers | Google Gemini, OpenAI, Anthropic Claude, Ollama (local) |
| Database | PostgreSQL with pgvector extension |
| ORM | Prisma |
| Job Queue | BullMQ (Redis-backed) |
| Authentication | JWT access tokens + refresh token rotation, Argon2 password hashing |
| Validation | Zod (runtime schema validation for API, config, and LLM outputs) |
| Containerization | Docker, Docker Compose |
| Testing | Vitest, Supertest |

---

## Project Structure

```
PlaywrightPilot/
|-- apps/
|   |-- api/                    # REST API (Express.js)
|   |   |-- src/
|   |   |   |-- middleware/     # Auth, validation, error handling
|   |   |   |-- modules/       # auth, projects, discoveries, scenarios, executions, reports, health
|   |   |   |-- routes/        # Route aggregation
|   |   |   |-- lib/           # Shared API utilities
|   |   |   |-- app.ts         # Express app factory (testable without .listen())
|   |   |   +-- server.ts      # Entry point with graceful shutdown
|   |   +-- Dockerfile
|   |
|   |-- web/                    # Web Dashboard (Next.js)
|   |   +-- src/
|   |       |-- app/
|   |       |   |-- (auth)/     # Login, register, forgot/reset password
|   |       |   +-- (dashboard)/# Project list, project detail with KPIs and charts
|   |       |-- components/     # UI components, charts, autopilot controls
|   |       +-- lib/            # API client, utilities
|   |
|   |-- executor/               # Browser Automation Engine
|   |   +-- src/
|   |       |-- browser/        # Browser context manager, URL guard (SSRF protection)
|   |       |-- discovery/      # Crawl orchestrator, link extractor, element classifier, selector strategy
|   |       |-- execution/      # Test process runner, artifact collector, workspace manager
|   |       |-- runner/         # Playwright runner with timeout, artifact capture
|   |       +-- worker.ts       # BullMQ worker entry (discovery + execution)
|   |
|   |-- orchestrator/           # AI Workflow Engine
|   |   +-- src/
|   |       |-- graphs/
|   |       |   |-- feature-understanding/   # LangGraph: page analysis, DOM compression, feature extraction
|   |       |   |-- scenario-generation/     # LangGraph: scenario creation from feature memory
|   |       |   |-- test-generation/         # LangGraph: plan, self-check, validate, persist
|   |       |   |-- failure-analysis/        # LangGraph: root cause analysis, classification, self-healing
|   |       |   +-- report-generation/       # LangGraph: statistics aggregation, LLM summary
|   |       |-- llm/
|   |       |   |-- client.ts               # Multi-provider router with fallback chain
|   |       |   |-- confidence.ts           # Confidence scoring and threshold
|   |       |   +-- providers/              # Gemini, OpenAI, Claude, Ollama adapters
|   |       +-- worker.ts                   # BullMQ worker entry (all AI pipelines)
|   |
|   +-- test-target/            # Sample application for testing PlaywrightPilot itself
|
|-- packages/
|   |-- database/               # Prisma schema, client, migrations
|   |-- queue/                  # BullMQ queue definitions and typed payloads
|   |-- config/                 # Zod-validated environment config
|   |-- logger/                 # Structured logging
|   +-- agent-memory/           # Vector memory service (pgvector)
|
|-- infra/
|   |-- docker-compose.yml      # Redis service
|   +-- docker/                 # Additional Docker configurations
|
+-- docs/                       # API and architecture documentation
```

---

## Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x (`corepack enable` to activate)
- **PostgreSQL** >= 15 with the [pgvector](https://github.com/pgvector/pgvector) extension enabled
- **Redis** >= 7.x (or use the provided Docker Compose)
- At least one LLM provider configured (see [LLM Provider Support](#llm-provider-support))

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/PlaywrightPilot.git
cd PlaywrightPilot
```

### 2. Install dependencies

```bash
corepack enable
pnpm install
```

This will also automatically install Playwright's Chromium browser (via the executor's `postinstall` script).

### 3. Start infrastructure services

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts Redis on port 6379.

### 4. Set up the database

Create a `.env` file in `apps/api/` (see [Configuration](#configuration)), then:

```bash
pnpm --filter @platform/database run db:push
```

### 5. Generate the Prisma client

```bash
pnpm --filter @platform/database run db:generate
```

### 6. Start all services in development

```bash
pnpm dev
```

This uses Turborepo to start all applications concurrently:

| Service | Default Port | Description |
|---|---|---|
| API | `4000` | REST API server |
| Web | `3000` | Next.js dashboard |
| Executor Worker | -- | BullMQ worker (discovery + execution) |
| Orchestrator Worker | -- | BullMQ worker (AI pipelines) |

Alternatively, start services individually:

```bash
# API server
pnpm --filter @platform/api run dev

# Web dashboard
pnpm --filter @platform/web run dev

# Executor workers
pnpm --filter @platform/executor run dev:worker

# Orchestrator workers
pnpm --filter @platform/orchestrator run dev:worker
```

---

## Configuration

All configuration is centralized in `packages/config/src/index.ts` using Zod validation. The application fails fast at startup if any required variable is missing or invalid.

Create a `.env` file in `apps/api/` with the following variables:

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/playwright_pilot`) |
| `JWT_SECRET` | Minimum 32 characters. Used for signing JWT access tokens. |

### Optional (with defaults)

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `4000` | API server port |
| `API_BASE_URL` | `http://localhost:4000` | Base URL for the API |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL for BullMQ |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | Log verbosity: fatal, error, warn, info, debug, trace |

### LLM Configuration

| Variable | Default | Description |
|---|---|---|
| `DEFAULT_LLM` | `gemini` | Default LLM provider for all calls |
| `FALLBACK_LLM` | `openai` | Comma-separated fallback chain |
| `FEATURE_LLM` | `gemini` | Provider for feature understanding |
| `SCENARIO_LLM` | `gemini` | Provider for scenario generation |
| `TESTPLAN_LLM` | `gemini` | Provider for test plan generation |
| `FAILURE_LLM` | `gemini` | Provider for failure analysis |
| `GEMINI_API_KEY` | -- | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `OPENAI_API_KEY` | -- | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model name |
| `ANTHROPIC_API_KEY` | -- | Anthropic API key |
| `CLAUDE_MODEL` | `claude-3-5-haiku-20241022` | Claude model name |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen3:32b` | Ollama model name |

### Executor Configuration

| Variable | Default | Description |
|---|---|---|
| `PLAYWRIGHT_HEADLESS` | `true` | Run browser in headless mode |
| `MAX_CONCURRENT_CONTEXTS` | `5` | Maximum parallel browser contexts |
| `EXECUTION_TIMEOUT_MS` | `30000` | Hard timeout per test execution (ms) |
| `TEST_PROCESS_TIMEOUT_MS` | `60000` | Timeout for spawned test process (ms) |
| `MAX_DISCOVERY_PAGES` | `100` | Maximum pages to crawl per discovery |
| `DISCOVERY_PAGE_TIMEOUT_MS` | `15000` | Page load timeout during crawl (ms) |

### Agent Memory Configuration

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model for vector storage |
| `MEMORY_DEDUPE_SIMILARITY_THRESHOLD` | `0.95` | Cosine similarity threshold for deduplication |
| `MEMORY_FRESHNESS_MS` | `2592000000` | Memory freshness window (30 days) |

---

## Usage

### 1. Create an account and log in

Navigate to `http://localhost:3000/register` to create an account, then log in.

### 2. Create a project

Provide a name and the base URL of the web application you want to test.

### 3. Run the pipeline

From the project dashboard, you can either run each stage individually or use **AutoPilot** to chain them automatically:

- **Start Discovery** -- Crawls the target URL and catalogs pages, elements, and screenshots.
- **Generate Scenarios** -- Uses AI to create prioritized test scenarios from the discovered features.
- **AutoPilot** -- Runs the full pipeline: discovery, feature understanding, scenario generation, test generation, execution, failure analysis, and reporting.

### 4. Review results

The dashboard displays:

- Execution success/failure rates
- Failure classification breakdown (site defects, stale tests, flaky environment)
- AI-generated summary reports
- Detailed execution artifacts (screenshots, videos, traces)

---

## API Reference

The REST API is served under `/api/v1` and exposes the following route groups:

| Route Group | Description |
|---|---|
| `GET /api/v1/health` | Health check |
| `/api/v1/auth/*` | Registration, login, token refresh, password reset |
| `/api/v1/projects/*` | Project CRUD, scenario generation trigger, autopilot controls, report generation |
| `/api/v1/discoveries/*` | Discovery creation and status |
| `/api/v1/scenarios/*` | Scenario listing and management |
| `/api/v1/tests/:testId/executions` | Test execution management |
| `/api/v1/executions/*` | Direct execution access |

All endpoints (except health and auth) require a valid JWT Bearer token in the `Authorization` header.

---

## LLM Provider Support

PlaywrightPilot includes a multi-provider LLM routing system with automatic fallback:

| Provider | Use Case | Local/Cloud |
|---|---|---|
| **Google Gemini** | Default provider. Best balance of speed and quality. | Cloud |
| **OpenAI (GPT)** | Primary fallback. Strong structured output capabilities. | Cloud |
| **Anthropic Claude** | Alternative cloud provider. | Cloud |
| **Ollama** | Fully local inference. No API keys required. | Local |

### Fallback Chain

When the primary provider fails or returns a low-confidence result, the system automatically tries the next provider in the configured fallback chain. Confidence scores are penalized cumulatively for fallback providers to prefer primary results when possible.

### Per-Stage Provider Assignment

Each AI pipeline stage can be configured to use a different LLM provider via environment variables (`FEATURE_LLM`, `SCENARIO_LLM`, `TESTPLAN_LLM`, `FAILURE_LLM`), allowing you to optimize cost and quality per task.

---

## Infrastructure

### Docker Compose (Development)

The included `infra/docker-compose.yml` provides:

- **Redis 7** (Alpine) with append-only persistence and health checks

### Dockerfiles

- `apps/executor/Dockerfile` -- Based on the official Playwright image with pre-installed Chromium
- `apps/api/Dockerfile` -- API server container

### Database

PostgreSQL with the pgvector extension is required. The complete schema is defined in `packages/database/prisma/schema.prisma` and includes 15 models covering organizations, users, projects, discoveries, pages, DOM elements, scenarios, test cases, executions, artifacts, failure analyses, self-healing suggestions, regression flags, comparison runs, agent memories, and reports.

---

## Testing

```bash
# Run all tests across the monorepo
pnpm test

# Run tests for a specific package
pnpm --filter @platform/api run test
pnpm --filter @platform/executor run test

# Run tests in watch mode (API)
pnpm --filter @platform/api run test:watch

# Open Prisma Studio to inspect the database
pnpm db:studio
```

The project uses **Vitest** as the test runner. Integration tests for the API use **Supertest** to test Express routes without opening a network port.

---

## License

This project is proprietary software. All rights reserved.
