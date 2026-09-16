# ColdProof MVP Boundaries

This document defines what is IN and OUT of scope for the ColdProof hackathon MVP. The focus is on demonstrating the core "perturbation proves causality" primitive reliably.

## MUST WORK (Tier 1)
- `coldproof verify` CLI command.
- Warm local execution.
- Clean Docker execution.
- Basic telemetry.
- Candidate detection (specifically for the hero case).
- Hero external binary case (e.g., `jq` is present locally but missing in clean).
- Controlled perturbation (e.g., blocking `jq` locally to see if it breaks).
- Failure signature comparison (e.g., matching exit codes and error logs).
- Evidence classification (e.g., labeling a candidate as `CONFIRMED`).

## SHOULD WORK (Tier 2)
- Fastify API.
- PostgreSQL database integration via Prisma.
- Investigation persistence (storing the structured JSON).
- Public investigation URL (`/investigation/<uuid>`).
- Next.js dashboard to visualize the causal diff.

## NICE TO HAVE (Tier 3)
- AI explanation (secondary to deterministic proof).
- Environment contract generation.
- Additional candidate types (e.g., environment variables, ports).
- Extra UI polish.
- Extra CLI commands (e.g., `coldproof init`, `coldproof report`).

## OUT OF SCOPE
- **Universal OS Support**: Focus initially on macOS/Linux.
- **Universal Language Support**: Focus strictly on Node.js + npm ecosystems.
- **eBPF/ptrace Universal Tracing**: Too risky and complex for a 36-hour hackathon. We will use practical approximations like PATH shims for MVP.
- **Automatic Project Repair**: The system diagnoses and documents; it does not automatically fix code or configuration.
- **Arbitrary Server-Side Code Execution**: All code runs locally on the developer's machine. The backend only handles JSON.
- **Enterprise Integrations / Complex Auth**: We integrated Firebase Auth for basic identity, but RBAC, Organizations, and Teams are out of scope.
- **Generic AI Coding Assistant**: AI is not the source of truth for causality.

## Why these boundaries?
The hackathon prioritizes a deterministic, reliable, and visually compelling demo over a sprawling but buggy feature set. We must prove the core concept: *Which difference changed the result?*
