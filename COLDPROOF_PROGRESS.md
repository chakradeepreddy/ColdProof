# ColdProof Progress

## Current Phase
Phase 5 — Perturbation Engine (Causality Proof)

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

## Files Modified
- `cli/src/types.ts`
- `cli/src/index.ts`

## Architecture Decisions
- Used `child_process.spawn` instead of `exec` to support stream capturing (stdout/stderr) natively without buffer limits.
- Built a foundational `coldproof run` command as the primitive for execution before building the complex `verify` logic.
- **[Phase 2]** Container isolation strategy: Mount host as `/src:ro` and use an ephemeral container initialization step (`tar cf - -C /src --exclude=node_modules . | tar xf - -C /workspace`) to construct a perfect, strictly-isolated, writable snapshot of the project in `/workspace`. This explicitly solves the `EROFS` issue caused by monorepo symlinks during `npm install` without leaking host `node_modules` or modifying the host directory.
- **[Phase 3]** Kept the comparison engine deterministic and pure. It defines success strictly via `exitCode === 0`. Outputs are retained as evidence in the signature but don't factor into the pass/fail behavior check. Does not attempt candidate detection or causation yet.
- **[Phase 4]** The Candidate Detector runs *after* comparison, and only if behavior diverged. It uses lightweight bash shims inserted into `PATH` to intercept and log invocations of standard developer binaries. Environment variables are checked only for presence using a strict MVP allowlist, ignoring noisy IDE/system flags and completely omitting values to ensure zero leak of secrets. Clean probes are run against the exact same `/workspace` snapshot as the clean execution runner.
- **[Phase 5]** The Perturbation Engine implements intervention-based evidence for executable candidates. Rather than simply observing differences (correlation), it manipulates the warm environment (hiding the executable via an isolated PATH shim) and evaluates whether that intervention reproduces the clean environment's failure signature. It strictly categorizes evidence based on this experiment rather than guessing causality.
- **[Phase 5 Correction]** The signature matcher now conservatively checks both exit codes and normalized stderr for failure similarity. Comparing solely by exit code is insufficient because an intervention (like a block shim) throwing `127` is different than an OS-level `127` missing executable. If outputs don't match, the engine correctly yields `STRONG_EVIDENCE` instead of `CONFIRMED`.

## Dependencies
- `commander` (CLI arguments)
- `chalk` (Terminal coloring)
- `ora` (Terminal spinners)
- `@types/node` (Node type definitions)

## Git State
- Repository was already initialized.
- Branch: `main`
- Remote: `origin` pointing to `https://github.com/chakradeepreddy/ColdProof.git`
- Status: Untracked files (no commit made in Phase 0 as per rules).

## Environment
- **Node.js**: v24.15.0
- **npm**: 11.12.1
- **Git**: 2.54.0
- **Docker**: 29.4.2

## Commands Used
- `npm install` (to bootstrap workspaces)
- `npm run build` (within `cli`)
- `node ./dist/index.js run "node --version"`

## Validation
- Successfully executed a simple command and parsed exit code 0.
- Successfully executed a failing command (`node -e 'process.exit(1)'`) and parsed exit code 1.
- **[Phase 3]** Validated `BOTH_PASS` with `node --version`.
- **[Phase 3]** Validated `BOTH_FAIL` with `node -e 'process.exit(1)'`.
- **[Phase 3]** Validated `WARM_PASS_CLEAN_FAIL` with `ls ./node_modules` (environment mismatch).
- **[Phase 3]** Validated `WARM_FAIL_CLEAN_PASS` with `test -d /etc/apk` (macOS vs Alpine).
- **[Phase 4]** Created Hero Fixture (`.coldproof-fixtures/hero.sh`) dependent on `jq` and `COLDPROOF_TEST_FLAG`. Successfully executed `coldproof investigate` to detect missing `COLDPROOF_TEST_FLAG`, mismatched `node` runtime, and the `jq` executable being invoked in warm but missing in clean.
- **[Phase 5]** Executed Hero Fixture. Confirmed perturbation correctly blocked `jq` in the warm environment, produced matching exit codes (`127`), and correctly reported `STRONG_EVIDENCE` of causality without modifying the user's host environment.
- **[Phase 5]** Evaluated `BOTH_PASS` scenario with `node -v` to ensure perturbation correctly short-circuits when no behavioral failure exists.

## Tests
Manual CLI validation completed across Phase 1, Phase 2, Phase 3, Phase 4, and Phase 5 deterministic scenarios. Automated unit tests deferred.

## Known Problems
- Phase 1 typecheck originally threw `TS18003` and `TS2591` / `TS7006` errors.
  - **Root Cause:** The root `tsconfig.json` was blindly compiling `cli/` files without `@types/node` and didn't properly delegate to the workspace via `references`. Furthermore, the `cli/tsconfig.json` lacked explicit `types: ["node"]`.
  - **Fix:** Added `types: ["node"]` to `cli/tsconfig.json`. Added `files: []` and `references: [{ "path": "./cli" }]` to the root `tsconfig.json` to properly delegate compilation to the workspace.
- Phase 2 execution initially threw `EROFS` during `npm install` due to monorepo symlinks in a read-only bind mount. Fixed via `/workspace` snapshot extraction.
- **[Phase 4 Limitation]** The executable shim only detects binaries on our hardcoded allowlist (`jq`, `curl`, `git`, `psql`, etc.). It will not automatically discover obscure global npm binaries without expanding the allowlist or building a dynamic PATH analyzer.
- **[Phase 4 Limitation]** The instrumentation pass executes the command a second time on the host machine to gather invocation telemetry. This is a duplicate execution that could be dangerous for commands with side-effects.

## Known Limitations
- The project is just an empty foundation. No features are implemented.

## NOT YET IMPLEMENTED
- Advanced Failure signature comparison (e.g., stderr textual diffing normalization)
- Perturbing environment variables
- Perturbing node runtime version
- **[Phase 6]** Initialized `apps/api` workspace with Fastify.
- **[Phase 6]** Configured Prisma with PostgreSQL schema (`User`, `Project`, `Investigation`).
- **[Phase 6]** Implemented Firebase Authentication JWT verification via `firebase-admin`.
- **[Phase 6]** Implemented strict ownership constraints and API payload validation in Fastify routes.

## Files Created
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/.env` and `apps/api/.env.example`
- `apps/api/test.js`

## Files Modified
- `cli/src/types.ts`
- `package.json` (root, to include `apps/api` in workspaces)

## Architecture Decisions
- **[Phase 6]** Backend API strictly enforces separation of concerns: Fastify handles request validation and routing, Firebase handles identity (JWT validation), and PostgreSQL manages state and relationships.
- **[Phase 6]** API avoids executing arbitrary commands to prevent Remote Code Execution (RCE) vulnerabilities. It acts purely as a secure ingestion and query layer for `InvestigationPayload` objects generated locally by the CLI.
- **[Phase 6]** Extracted CLI `ExecutionResult` and other types into `InvestigationPayload` within `cli/src/types.ts` to form a strict contract between the client CLI and the Fastify backend without duplicating types.

## Dependencies
- `fastify` (API routing)
- `prisma`, `@prisma/client` (PostgreSQL ORM)
- `firebase-admin` (Authentication verification)
- `dotenv`, `@fastify/cors`

## Git State
- Repository was already initialized.
- Branch: `main`
- Status: Modified and untracked files for `apps/api` and `cli/src/types.ts`.

## Commands Used
- `cd apps/api && npm init -y`
- `npm install fastify firebase-admin @prisma/client`
- `npx prisma init`
- `npx prisma migrate dev --name init`
- `node test.js`

## Validation
- **[Phase 6]** Server startup successful (`node dist/index.js`).
- **[Phase 6]** Unauthenticated requests to `/api/projects` correctly rejected with HTTP 401.
- **[Phase 6]** Verified Firebase JWT hook mapping mock token (`TEST_TOKEN`) to a PostgreSQL `User` record creation.
- **[Phase 6]** Successfully completed `POST /api/investigations` with realistic `InvestigationPayload`, storing `Json` blob in PostgreSQL and retrieving via `GET /api/investigations/:id`.

## Tests
Automated mock-auth integration test passed for Phase 6 endpoints: `GET /health`, `GET /api/me`, `POST /api/projects`, `GET /api/projects`, `POST /api/investigations`, and `GET /api/investigations/:id`.

## Known Problems
- **[Phase 6 Limitation]** Live Firebase tokens cannot be tested end-to-end without a frontend SDK to mint them. We validated the admin verification logic by bypassing it strictly during `NODE_ENV='test'`.

## Known Limitations
- The project is just an empty foundation. No features are implemented.

## NOT YET IMPLEMENTED
- Dashboard (Next.js)

## Phase Integrity
Ready for checkpoint.

## Next Phase
Phase 7 — Next.js Dashboard Foundation

## Forbidden Changes / Scope Boundaries
- Do not implement universal OS/Language support.
- Do not implement eBPF/ptrace tracing.
- Do not write fake tests.
