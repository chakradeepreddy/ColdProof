# ColdProof Progress

## Current Phase
Phase 2 — Clean Docker Execution Engine

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

## Files Created
- `cli/package.json`
- `cli/tsconfig.json`
- `cli/src/types.ts`
- `cli/src/engine/execute.ts`
- `cli/src/engine/executeClean.ts`
- `cli/src/index.ts`

## Files Modified
- `cli/src/index.ts`

## Architecture Decisions
- Used `child_process.spawn` instead of `exec` to support stream capturing (stdout/stderr) natively without buffer limits.
- Built a foundational `coldproof run` command as the primitive for execution before building the complex `verify` logic.
- **[Phase 2]** Container isolation strategy: Mount host as `/src:ro` and use an ephemeral container initialization step (`tar cf - -C /src --exclude=node_modules . | tar xf - -C /workspace`) to construct a perfect, strictly-isolated, writable snapshot of the project in `/workspace`. This explicitly solves the `EROFS` issue caused by monorepo symlinks during `npm install` without leaking host `node_modules` or modifying the host directory.

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

## Tests
Manual CLI validation completed. Automated unit tests deferred.

## Known Problems
- Phase 1 typecheck originally threw `TS18003` and `TS2591` / `TS7006` errors.
  - **Root Cause:** The root `tsconfig.json` was blindly compiling `cli/` files without `@types/node` and didn't properly delegate to the workspace via `references`. Furthermore, the `cli/tsconfig.json` lacked explicit `types: ["node"]`.
  - **Fix:** Added `types: ["node"]` to `cli/tsconfig.json`. Added `files: []` and `references: [{ "path": "./cli" }]` to the root `tsconfig.json` to properly delegate compilation to the workspace.

## Known Limitations
- The project is just an empty foundation. No features are implemented.

## NOT YET IMPLEMENTED
- Candidate detection
- Perturbation engine
- Failure signature comparison
- Causal evidence classification
- Backend API (Fastify)
- PostgreSQL / Prisma
- Dashboard (Next.js)

## Demo Status
Not ready.

## Next Phase
Phase 3 — Comparison Engine

## Forbidden Changes / Scope Boundaries
- Do not implement universal OS/Language support.
- Do not implement eBPF/ptrace tracing.
- Do not write fake tests.
- Do not push to GitHub unless explicitly asked.
