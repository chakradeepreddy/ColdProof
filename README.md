# ColdProof

**“Don’t just show me what’s different. Show me which difference changed the result.”**

## Problem
Developers frequently encounter software that works on their local machine but fails in CI or a clean environment because the project depends on undocumented machine-specific state (e.g., globally installed CLI tools, PATH differences, environment variables). Existing tools standardise environments or show differences, but they do not answer the question: “Which environmental difference actually CAUSED the behavioral failure?”

## Solution
ColdProof is an execution-based environment causality debugger. It answers the causality question experimentally, turning observed environment differences into proven requirements through controlled execution.

## Core Workflow
ColdProof follows: **REPRODUCE → PERTURB → PROVE**

1. **CODE**: Write or run your project.
2. **WARM RUN**: Execute locally where it passes.
3. **CLEAN RUN**: Execute in a clean Docker environment where it fails.
4. **ENVIRONMENT DIFFERENCES**: Identify candidate dependencies (e.g., `jq` exists locally but not in the clean container).
5. **CANDIDATE ASSUMPTIONS**: Form hypotheses based on differences.
6. **CONTROLLED PERTURBATION**: Perturb the environment (e.g., block `jq` locally or inject it into the clean environment).
7. **CAUSAL EVIDENCE**: Compare the resulting failure signature. If blocking `jq` locally reproduces the identical failure, causality is confirmed.
8. **ENVIRONMENT CONTRACT**: Generate a contract of required dependencies.

## Architecture Overview
The ColdProof ecosystem consists of:
- **ColdProof CLI** (Runs on Developer Machine): Responsible for executing warm/clean runs, detecting candidates, perturbing the environment, and classifying evidence.
- **Backend API**: A Fastify API that receives structured investigation results from the CLI.
- **PostgreSQL Database**: Persists investigations.
- **Web Dashboard**: A Next.js frontend to visualize the causal diffs and generated environment contracts.

## Intended Tech Stack
- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, TypeScript, Fastify
- **Database**: PostgreSQL, Prisma
- **CLI**: Node.js, TypeScript, Commander, Chalk, Ora
- **Execution**: Docker, Node `child_process`, Bash

## MVP Scope
The hackathon MVP prioritizes the core CLI experience proving a single external binary dependency (like `jq`). See `docs/MVP_BOUNDARIES.md` for full details.

## Development Status
*Phase 0 — Project Foundation (Currently implemented)*
- Basic project structure, configuration, and documentation established.
- *Planned*: Core CLI, execution engine, candidate detection, API, and Web dashboard are coming in later phases.

## Local Development Prerequisites
- Node.js >= 22
- npm >= 10
- Git
- Docker

## Future Phases
- Phase 1: Core CLI & Execution Engine
- Phase 2: Candidate Detection & Perturbation
- Phase 3: Backend API & Database
- Phase 4: Web Dashboard Visualization
