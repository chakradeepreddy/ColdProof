# ColdProof

> Don't just show me what's different. Show me which difference changed the result.

ColdProof is an execution-based environment causality debugger. It solves the "works on my machine" problem by experimentally proving exactly *which* environment difference caused your build or script to fail.

Website Url : https://cold-proof-web-two.vercel.app

## What is ColdProof?

When a project works correctly on a developer's machine but fails in CI or a teammate's machine, the first step is often looking at the environment differences. But the most important question is not merely finding that environments are different. The important question is: **"Which difference actually changed the result?"**

ColdProof replaces guesswork with controlled experiments. It identifies environment differences, experimentally alters them, and observes the results to produce evidence-backed proof of causality.

**ENVIRONMENT DIFFERENCE ≠ ENVIRONMENT CAUSE**

## The Core Idea: REPRODUCE → PERTURB → PROVE

1. **REPRODUCE:** ColdProof takes a real command from your project (e.g., your build or test script) and runs it in your normal (warm) environment, and then again in a clean containerized environment.
2. **PERTURB:** ColdProof identifies environmental differences and performs a *perturbation*—temporarily changing one specific piece of the environment in a controlled way and re-running the exact same command.
3. **PROVE:** By observing whether the original failure disappears or changes, ColdProof's deterministic engine produces a classification proving whether that specific environment difference is the true root cause.

## How ColdProof Works

1. **Warm execution**: Runs the user-provided command in the developer's normal environment.
2. **Clean execution**: Runs the exact same command inside a clean execution environment (currently a `node:22-slim` Docker container).
3. **Behavior comparison**: Compares the exit codes and logs of the two runs. If the behavior differs, it establishes a failure signature.
4. **Environment candidates**: Looks for specific environment differences associated with the observed behavior.
5. **Controlled perturbation**: Blocks or restores one candidate at a time and re-runs the command.
6. **Evidence classification**: Compares the new execution's behavior against the original failure signature to determine if the candidate actually affected the failure.
7. **Investigation result**: Uploads the result to the dashboard for visualization and optional AI-generated explanation.

## What ColdProof Detects

ColdProof's engine actively detects the following types of environment candidates:

- **Executable / Binary (PATH Shim):** Global tools that were invoked in your normal environment but are missing in the clean environment (e.g., `git`, `python`, `curl`).
- **Project-Local Executable:** `node_modules/.bin/` executables that are missing in the clean environment.
- **Runtime Version:** Differences in the `node` version between the two environments.
- **Environment Variables:** Differences in a strict allowlist of critical variables (e.g., `DATABASE_URL`, `NODE_ENV`).

*Note: ColdProof does not treat every environment difference as a cause, and it only tests the candidates it detects.*

## Evidence Classifications

The deterministic engine classifies the evidence from the perturbation experiment:

- **CONFIRMED**: A candidate was experimentally shown to reproduce the relevant behavior. This is strong causal proof.
- **STRONG_EVIDENCE**: The candidate's perturbation reproduces the observed failure boundary (same exit code), but the exact root cause or output text may require additional context.
- **PARTIAL_EVIDENCE**: Changing the candidate removes or changes the original failure, but another failure remains. The candidate contributed to the failure, but was not the sole root cause.
- **NOT_IMPLICATED**: Testing the candidate does not reproduce the relevant behavior. The evidence does not support this candidate as the cause.
- **NO ENVIRONMENT CAUSE FOUND**: ColdProof could not find an environment difference that it could experimentally connect to the failure.

*An honest "no environment cause found" result is preferable to inventing an explanation. ColdProof prioritizes truth over guesses.*

## Why This Is Different

- **Traditional environment comparison:** "Here are the 50 differences between your machine and CI."
- **Reproducibility tools:** "Here is how to standardize the environment using containers or Nix."
- **ColdProof:** "Here is the exact environmental difference that experimentally caused the failure."

## Product Walkthrough

### Dashboard
The main landing page, presenting the core "Difference ≠ Cause" philosophy and a visual overview of the Reproduce → Perturb → Prove pipeline.

### Login
Firebase-powered authentication to secure your investigation history.

### Investigations
Your personalized archive of uploaded investigations, displaying the command, behavioral differences, tested candidates, and evidence classifications at a glance.

### New Investigation
Instructions for installing the CLI and securely linking your local terminal to your ColdProof account using tokens, so you can run an investigation against your real project commands.

### Evidence Details
A deep-dive view into a specific investigation. It shows:
- **What Happened?** (Warm vs. Clean execution logs)
- **What Was Different?** (Detected candidates)
- **What Did ColdProof Test?** (Perturbation execution logs)
- **What Changed After the Test?** (Signature matches)
- **Evidence Result** (The final deterministic classification)
- **AI Explanation** (An optional, plain-English translation of the deterministic result)

## The ColdProof CLI

The ColdProof CLI executes the experiments locally on the developer's machine.

### Published on npm

The ColdProof CLI is publicly published as the `coldproof` npm package, so developers can install it directly from their terminal.

```bash
npm install -g coldproof@0.1.5
```

After installation, verify it with:

```bash
coldproof --help
```

The CLI performs the investigation locally, while the ColdProof web application stores and visualizes the resulting evidence.

> **Current CLI version:** `0.1.4`

### Available Commands

- `coldproof investigate <command>`: The main workflow. It compares environments, identifies candidates, performs controlled perturbations, classifies the evidence, and uploads the result.
- `coldproof run <command>`: Runs a command and captures execution telemetry, optionally using `-c` for clean execution.
- `coldproof compare <command>`: Compares execution of a command between warm and clean environments.

### Choosing Your Project Command

**ColdProof does not randomly choose a command. You must supply a real command used by your project.**

For example, if you are investigating a build failure in a Node.js project, check the `scripts` section of your `package.json` and run:

```bash
coldproof investigate "npm run build"
```

For a type-checking workflow, the command could instead be:

```bash
coldproof investigate "npm run typecheck"
```

These are examples only. Use the command that your project actually uses and that reproduces the behavior you want to investigate.

> **Bring the command your project actually uses.**

## Architecture

```text
User
 ↓
ColdProof CLI
 ↓
Investigation Engine
 ├── Warm Execution (Host)
 ├── Clean Execution (Docker)
 ├── Environment Comparison
 ├── Candidate Detection
 ├── Controlled Perturbation
 └── Evidence Classification
 ↓
Backend API (Node.js/Fastify)
 ↓
Database (PostgreSQL)
 ↓
Web App UI (Next.js) + Optional Groq AI Explanation
```

Each layer has a distinct responsibility: the CLI performs local experiments, the investigation engine performs causal analysis, the API persists results, PostgreSQL stores investigation history, and the web application visualizes the evidence. This separation keeps the causal engine independent from the presentation layer.

## Key Technical Decisions

### 1. Why a CLI?
ColdProof needs access to the local command, local environment, installed executables, PATH, runtime, and Docker. A CLI is therefore the natural execution interface. Running this close to the developer's actual environment allows it to capture authentic "warm" telemetry rather than attempting to perfectly mock it in the cloud.

### 2. Why warm vs clean execution?
ColdProof does not simply compare configuration files. By executing the actual command in both environments, the system observes a behavioral difference (like a failing exit code) instead of relying only on static configuration differences.

### 3. Why controlled perturbation?
Environment difference ≠ environment cause. Simply finding that a dependency exists in one environment and not another does not prove that it caused the failure. ColdProof temporarily blocks or restores a candidate and reruns the same command. This turns environment debugging into an experiment, replacing guessing with proof.

### 4. Why Docker for the clean environment?
Docker provides reproducibility, isolation, and a clean baseline, avoiding contamination from the developer's machine while giving ColdProof control over the execution environment. (Note: The current MVP requires Docker to be running locally).

### 5. Why deterministic evidence classification?
ColdProof's investigation engine is the source of truth, not an LLM. The engine observes exit codes, execution results, logs, and perturbation results, and deterministically classifies the evidence. This makes the core causal classification reproducible and auditable.

### 6. Why AI is only an explanation layer?
Groq's LLM functionality is used exclusively to translate deterministic evidence into beginner-friendly language. AI does NOT decide causality, invent causes, override evidence, or determine the final classification. This is an intentional reliability and design decision to prevent hallucinations in causal debugging.

### 7. Why PostgreSQL + Prisma?
PostgreSQL and Prisma provide structured, maintainable persistence of users, projects, and investigations. This allows developers to maintain a historical archive of investigations and share them securely. 

### 8. Why separate frontend/backend/CLI?
This separation of concerns—CLI for local experimentation, API for ingestion, database for history, and frontend for visualization—improves maintainability. It allows the causal execution engine to be modified without impacting the web dashboard, and vice-versa.

### 9. Security decisions
- **Firebase Authentication**: Provides secure identity management without building custom auth.
- **Token-based CLI authentication**: The `COLDPROOF_TOKEN` environment variable ensures telemetry is securely uploaded to the correct user.
- **CORS configuration**: The API is restricted to the specific frontend domain via `CORS_ORIGIN`.
- **Read-only execution**: During clean execution, the developer's source code is mounted as a read-only volume (`:ro`) inside the Docker container to prevent destructive modifications. Furthermore, source code remains entirely local and is never uploaded to the ColdProof API.

### 10. Testing / validation decision
ColdProof was validated against itself, QuickCart, RealityCheck, CodeJudge, and an unrelated black-box temporary project. The unrelated project was important because it proved that the engine could dynamically discover and investigate an unknown project, rather than relying on a hardcoded demo fixture.

## Scalability

While the current MVP demonstrates the core value of ColdProof, the architecture is designed to scale across multiple dimensions in the future:

### 1. Execution Scalability
The investigation engine currently performs local warm/clean execution sequentially. In a scaled version, the execution layer could evolve toward isolated cloud worker environments. Multiple investigations could be executed independently by workers, and candidate perturbations—since they are independent experiments—are naturally parallelizable. Scaling would involve resource limits, isolation boundaries, timeouts, and concurrency controls.

### 2. Environment / Ecosystem Scalability
The current MVP uses Docker with a Node-oriented (`node:22-slim`) clean environment. The execution abstraction is designed so that future extensions can support multiple runtime and container images (e.g., Python, Java, Go, Rust), dynamically mapping the clean environment to the user's technology stack.

### 3. Candidate Detection Scalability
The candidate detection system can be extended with additional specific detectors. While the current MVP detects specific executables, project-local binaries, node versions, and allowlisted environment variables, future extensions could detect filesystem state differences, package-manager lockfile drift, background services, and OS-level library differences.

### 4. Backend Scalability
The Fastify + PostgreSQL architecture can scale horizontally. As investigation volume grows, ingestion and API responsibilities can be cleanly separated from asynchronous processing queues.

### 5. Storage Scalability
Investigation telemetry (especially full stdout/stderr logs) can grow significantly. In the future, structured metadata can remain in PostgreSQL while large artifacts and log streams are offloaded to object/blob storage (e.g., AWS S3 or Google Cloud Storage).

### 6. Perturbation Scalability
As the number of detected candidates grows, testing every candidate sequentially becomes expensive. ColdProof's experimental model provides a natural path toward parallel independent perturbation experiments, candidate prioritization (testing highly likely causes first), resource budgets, and early stopping when sufficient causal evidence is obtained.

ColdProof’s architecture separates execution, candidate detection, perturbation, evidence classification, persistence, and visualization, making each layer independently extensible as investigation volume and supported environments grow.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 / React 19 / Tailwind CSS | UI and dashboard rendering |
| **Backend** | Node.js / Fastify | REST API for investigation telemetry |
| **Database** | PostgreSQL / Prisma | Storing users, projects, and investigations |
| **CLI** | Node.js / Commander / Chalk | Local execution, perturbation, and data gathering |
| **Execution** | Docker | Clean environment isolation |
| **Authentication** | Firebase Auth | User authentication and API authorization |
| **AI** | Groq (`openai/gpt-oss-120b`) | Explanation and translation layer |
| **Deployment** | Vercel (Web), Render (API) | Application hosting |

## AI Usage & Philosophy

**DETERMINISTIC ENGINE = SOURCE OF TRUTH**  
**AI = EXPLANATION / TRANSLATION LAYER**

ColdProof uses the Groq SDK (currently defaulting to `openai/gpt-oss-120b`) strictly as an explanation layer. 

- **What it receives:** The AI receives a truncated summary of the execution logs, the detected candidates, and the engine's deterministic evidence classification.
- **What it does:** It translates the technical evidence into a beginner-friendly, plain-English summary.
- **What it DOES NOT do:** The AI *never* determines causality, makes guesses about unproven differences, or overrides the experimental engine. If the engine says `NOT_IMPLICATED`, the AI explains why. 

If the AI is unavailable, ColdProof still functions perfectly using its deterministic engine results.

## Authentication & Data

- Authentication is managed via Firebase.
- The CLI uploads telemetry (execution status, candidates, perturbation evidence, truncated logs) to the backend API if authenticated via the `COLDPROOF_TOKEN` environment variable.
- The clean execution runs locally via Docker; your source code is mounted read-only and never uploaded to ColdProof's servers.

## Validation

ColdProof's engine has been tested and validated on:
1. The ColdProof project itself
2. Internal demo projects (QuickCart, RealityCheck, CodeJudge)
3. An unrelated, unknown temporary project black-box test

The unknown-project validation was designed to test whether ColdProof can operate dynamically without project-specific knowledge. It successfully discovered missing environmental executables without hardcoded assumptions.

## Current MVP & Limitations

**Currently Implemented in MVP:**
- Full CLI investigation engine (reproduce, detect, perturb, classify).
- Web dashboard with Firebase authentication.
- Uploading and viewing investigation telemetry.
- Optional AI evidence translation.

**Current Limitations & Future Extensions:**
- **Execution:** Currently requires Docker to be installed and running locally for the clean environment.
- **Ecosystem:** The clean environment currently defaults to a `node:22-slim` Docker image, making it primarily suited for Node.js/npm-based projects.
- **Candidate Detection:** Project-local executable detection is currently tied to `node_modules/.bin`. Executable PATH blocking is limited to a specific allowlist of common binaries.
- **Platform:** ColdProof currently supports macOS, Linux, and Windows.

## Project Structure

```text
.
├── apps/
│   ├── api/       # Fastify backend & PostgreSQL database logic
│   └── web/       # Next.js frontend UI
├── cli/           # Node.js investigation engine & CLI tool
├── package.json   # Workspace definition
└── README.md
```

## Local Development

```bash
# Install dependencies
npm install

# Run frontend (requires .env configuration)
cd apps/web
npm run dev

# Run backend API
cd apps/api
npm run dev

# Build and run CLI
cd cli
npm run build
npm link
coldproof --help
```

## AI Development Disclosure

AI tools including Claude and Gemini were used as development assistants for code generation, debugging, research, UI/UX refinement, and implementation support. As a solo developer, I designed the product concept and architecture, defined the investigation workflow and causal reasoning approach, made the key technical and product decisions, and reviewed and integrated the generated work. I independently tested and validated ColdProof through real-world project investigations and an unrelated unknown-project black-box test. The final implementation, testing, and submitted product were reviewed and verified by me rather than relying solely on AI-generated output.
