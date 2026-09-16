# ColdProof Progress

## Current Phase
Phase 8 — Dashboard Enhancements & Polishing

## Status
Completed

## Completed Work
- Scaffolded CLI workspace (`cli/package.json`, `cli/tsconfig.json`).
- Installed `commander`, `chalk`, `ora` for CLI UX.
- Implemented `ExecutionResult` types.
- Implemented `executeCommand` using Node's `child_process.spawn`.
- Implemented `coldproof run <command>` entry point.
- Validated command execution (success and failure pathways).
- **[Phase 2]** Implemented `executeCleanCommand` using Docker for isolated execution.
- **[Phase 2]** Added `--clean` flag to `coldproof run`.
- **[Phase 2]** Verified containerized execution and `node_modules` masking via anonymous volumes.
- **[Phase 3]** Added `ComparisonResult`, `ComparisonClassification`, and `EnvironmentalFailureSignature` types.
- **[Phase 4]** Defined `EnvironmentCandidate` and `CandidateType` models.
- **[Phase 4]** Built Candidate Detection Engine in `candidates.ts` using independent Probes for node versions, environment variables, and executables.
- **[Phase 4 Correction]** Refactored clean probes to strictly use `executeCleanCommand` to ensure consistency with the isolated `/workspace` snapshot.
- **[Phase 4 Correction]** Filtered environment variables to a strict MVP allowlist to eliminate system noise and preserve privacy.
- **[Phase 4 Correction]** Hardened the PATH shim by dynamically resolving the absolute path of real binaries on the host, preventing recursion and fragile bash path replacements.
- **[Phase 4 Correction]** Added explicit logging for the duplicate MVP instrumentation pass.
- **[Phase 4]** Added `coldproof investigate <command>` entry point to CLI to chain Execution -> Comparison -> Detection.
- **[Phase 5 Correction]** Hardened `matchFailureSignatures` into `analyzeFailureSignatures` to evaluate both exit code and textual similarity of the failure. Strips absolute paths and ColdProof block messages during output normalization to enable robust matching without complex AI diffs.
- **[Phase 5 Correction]** Downgraded perturbation evidence logic to be highly conservative. An exit code match where outputs differ is now classified as `STRONG_EVIDENCE`, leaving `CONFIRMED` only for identical failure footprints.
- **[Phase 5]** Defined `PerturbationResult` and `PerturbationEvidence` structures in `types.ts` for structured causal evaluation.
- **[Phase 5]** Extended `executeCommand` to support optional execution environment overrides.
- **[Phase 5]** Implemented the core Perturbation Engine in `perturb.ts` for executable candidates. It safely generates an isolated bash shim to block access (returns exit code 127) while leaving the system `PATH` and binaries untouched.
- **[Phase 5]** Built failure signature matching in `perturb.ts` that compares exit codes to classify causal evidence as `STRONG_EVIDENCE`, `NOT_IMPLICATED`, or `UNABLE_TO_TEST`.
- **[Phase 5]** Integrated Perturbation seamlessly into `coldproof investigate` CLI command, running perturbation dynamically if `EXECUTABLE` candidates are observed.
- **[Phase 6]** Initialized `apps/api` workspace with Fastify, configured on port 3001.
- **[Phase 6]** Configured Prisma with PostgreSQL schema (`User`, `Project`, `Investigation`).
- **[Phase 6]** Implemented Firebase Authentication JWT verification via `firebase-admin`.
- **[Phase 6]** Implemented strict ownership constraints and API payload validation in Fastify routes.
- **[Phase 7]** Scaffolded `apps/web` using Next.js, Tailwind, and Shadcn UI.
- **[Phase 7]** Implemented Firebase Web Auth and connected it to the frontend login page.
- **[Phase 7]** Set up the `/investigations/new` page and unified API base URLs (`http://localhost:3001`) for the frontend.
- **[Phase 7]** Integrated CLI with Fastify API, respecting `COLDPROOF_API_URL`, `COLDPROOF_TOKEN`, and `COLDPROOF_PROJECT_ID` environment variables for telemetry upload.
- **[Phase 7]** Removed manual `COLDPROOF_TEST_FLAG` from `.coldproof-fixtures/hero.sh`. The fixture now acts as a perfect natural end-to-end demo script that fails simply due to the absence of `jq` in the container.
- **[Phase 7]** Successfully completed an end-to-end run: ran investigation via CLI on host, pushed telemetry to Fastify, and stored into PostgreSQL securely.
- **[Phase 7]** Replaced the Clean runner base image from `node:22-alpine` to `node:22-slim` to provide native `bash` support, fixing a misleading exit 127 `not found` error on script invocation and allowing `jq: command not found` to surface naturally.
- **[Phase 7]** Updated the New Investigation page UI to match the exact UX specifications, hiding auth tokens and explicitly defining the `Warm -> Clean -> Compare -> Perturb -> Prove` execution flow.
- **[Phase 8]** Implemented a global authenticated `Navbar` component with Next.js active route tracking.
- **[Phase 8]** Polished the Investigations dashboard (`page.tsx`) with highly refined typography, unified layout cards, and seamless hover transitions.
- **[Phase 8]** Overhauled the New Investigation page (`investigations/new/page.tsx`) with explicit technical honesty ("How ColdProof Works" disclaimer) and premium UI spacing.
- **[Phase 8]** Polished the Causal Proof page (`investigations/[id]/page.tsx`) utilizing strong visual hierarchy and custom tailwind effects (`shadow-[0_0_15px_rgba...]`) to spotlight `STRONG EVIDENCE` without inflating or faking data.
- **[Phase 8]** Preserved all core engine, API, database, and auth functionality completely untouched during UI upgrades.

## Files Created
- `cli/package.json`
- `cli/tsconfig.json`
- `cli/src/types.ts`
- `cli/src/engine/execute.ts`
- `cli/src/engine/executeClean.ts`
- `cli/src/engine/compare.ts`
- `cli/src/engine/candidates.ts`
- `cli/src/engine/perturb.ts`
- `cli/src/index.ts`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/.env` and `apps/api/.env.example`
- `apps/api/test.js`
- `apps/web/...` (Next.js foundation)

## Files Modified
- `cli/src/types.ts`
- `cli/src/index.ts`
- `package.json` (root, to include `apps/api` and `apps/web` in workspaces)
- `.coldproof-fixtures/hero.sh`

## Architecture Decisions
- Used `child_process.spawn` instead of `exec` to support stream capturing (stdout/stderr) natively without buffer limits.
- Built a foundational `coldproof run` command as the primitive for execution before building the complex `verify` logic.
- **[Phase 2]** Container isolation strategy: Mount host as `/src:ro` and use an ephemeral container initialization step (`tar cf - -C /src --exclude=node_modules . | tar xf - -C /workspace`) to construct a perfect, strictly-isolated, writable snapshot of the project in `/workspace`. This explicitly solves the `EROFS` issue caused by monorepo symlinks during `npm install` without leaking host `node_modules` or modifying the host directory.
- **[Phase 3]** Kept the comparison engine deterministic and pure. It defines success strictly via `exitCode === 0`. Outputs are retained as evidence in the signature but don't factor into the pass/fail behavior check. Does not attempt candidate detection or causation yet.
- **[Phase 4]** The Candidate Detector runs *after* comparison, and only if behavior diverged. It uses lightweight bash shims inserted into `PATH` to intercept and log invocations of standard developer binaries. Environment variables are checked only for presence using a strict MVP allowlist, ignoring noisy IDE/system flags and completely omitting values to ensure zero leak of secrets. Clean probes are run against the exact same `/workspace` snapshot as the clean execution runner.
- **[Phase 5]** The Perturbation Engine implements intervention-based evidence for executable candidates. Rather than simply observing differences (correlation), it manipulates the warm environment (hiding the executable via an isolated PATH shim) and evaluates whether that intervention reproduces the clean environment's failure signature. It strictly categorizes evidence based on this experiment rather than guessing causality.
- **[Phase 5 Correction]** The signature matcher now conservatively checks both exit codes and normalized stderr for failure similarity. Comparing solely by exit code is insufficient because an intervention (like a block shim) throwing `127` is different than an OS-level `127` missing executable. If outputs don't match, the engine correctly yields `STRONG_EVIDENCE` instead of `CONFIRMED`.
- **[Phase 6]** Backend API strictly enforces separation of concerns: Fastify handles request validation and routing, Firebase handles identity (JWT validation), and PostgreSQL manages state and relationships.
- **[Phase 6]** API avoids executing arbitrary commands to prevent Remote Code Execution (RCE) vulnerabilities. It acts purely as a secure ingestion and query layer for `InvestigationPayload` objects generated locally by the CLI.
- **[Phase 6]** Extracted CLI `ExecutionResult` and other types into `InvestigationPayload` within `cli/src/types.ts` to form a strict contract between the client CLI and the Fastify backend without duplicating types.
- **[Phase 7]** Next.js acts purely as a frontend consumer (port 3000), decoupling backend logic to Fastify (port 3001) to avoid heavy API routes in Next.js and to allow independent scaling.

## Dependencies
- `commander` (CLI arguments)
- `chalk` (Terminal coloring)
- `ora` (Terminal spinners)
- `@types/node` (Node type definitions)
- `fastify` (API routing)
- `prisma`, `@prisma/client` (PostgreSQL ORM)
- `firebase-admin` (Authentication verification)
- `dotenv`, `@fastify/cors`
- `next`, `react`, `firebase` (Frontend)

## Git State
- Repository was already initialized.
- Branch: `main`
- Status: Modified and untracked files for `apps/api`, `apps/web`, and CLI.

## Commands Used
- `npm install`
- `npm run build -w cli`
- `npm run dev -w apps/api`
- `npm run dev -w web`

## Validation
- Successfully executed end-to-end telemetry upload with valid Firebase token.
- Perturbation blocks `jq` naturally without requiring test flags.

## Tests
Manual CLI validation completed across all Phases. Automated unit tests deferred.

## Known Problems
- **[Phase 4 Limitation]** The executable shim only detects binaries on our hardcoded allowlist (`jq`, `curl`, `git`, `psql`, etc.). It will not automatically discover obscure global npm binaries without expanding the allowlist or building a dynamic PATH analyzer.
- **[Phase 4 Limitation]** The instrumentation pass executes the command a second time on the host machine to gather invocation telemetry. This is a duplicate execution that could be dangerous for commands with side-effects.

## Known Limitations
- The project is an MVP foundation. Dashboard components are still largely scaffolds.

## NOT YET IMPLEMENTED
- Perturbing environment variables
- Perturbing node runtime version

## Phase Integrity
Ready for checkpoint.

## Next Phase
TBD

## Forbidden Changes / Scope Boundaries
- Do not implement universal OS/Language support.
- Do not implement eBPF/ptrace tracing.
- Do not write fake tests.
- **[Phase 9]** Performed End-to-End Reliability & Hardening.
- **[Phase 9]** Cleaned temporary scratch files (`env.sh`, `scratch.js`, `test-shebang.sh`, `investigation_report.md`).
- **[Phase 9]** Removed stale references to `COLDPROOF_TEST_FLAG` from `cli/src/engine/candidates.ts`. Validated that `localhost:3001` references are legitimate development fallbacks.
- **[Phase 9]** Verified Clean Execution naturally detecting `jq` as the candidate cause without manual flags.
- **[Phase 9]** Validated Perturbation and Causal Pipeline, maintaining the `STRONG_EVIDENCE` classification boundary.
- **[Phase 9]** Tested end-to-end Telemetry upload using a fresh generated Firebase token. Verified API correctly handles and stores the `InvestigationPayload`.
- **[Phase 9]** Conducted Security Audit. Confirmed that NO `spawn` or `exec` commands exist in `apps/api` or `apps/web`.
- **[Phase 9]** Added `typecheck` script to `cli/package.json` and verified full composite build (`npm run typecheck` and `npm run build -w apps/web`).
