# ColdProof Architecture

## 1. Product Overview
ColdProof is an execution-based environment causality debugger for developers. It bridges the gap between identifying environment differences and proving which difference actually caused a behavioral failure.

## 2. Core Problem
Software that "works on my machine" often fails elsewhere due to undocumented state (e.g., global tools, runtime versions, environment variables, local services). Current tools show what changed, but they don't prove what broke the execution.

## 3. Core Insight
A difference is not automatically a cause. ColdProof uses experimental causal attribution (perturbation) rather than simple environment comparison.

## 4. REPRODUCE → PERTURB → PROVE
The conceptual model is:
- Run the code locally (Warm Run).
- Run the code in a clean environment (Clean Run).
- Identify candidate differences.
- Perform a controlled perturbation (e.g., block the candidate in the warm environment).
- Compare failure signatures to confirm causality.

## 5. Architectural Principle
**EXECUTES LOCALLY, PROVES LOCALLY, PERSISTS REMOTELY, VISUALIZES REMOTELY.**

- The local CLI is entirely responsible for execution.
- The web application does NOT execute arbitrary developer code on the server.
- The backend simply receives and stores structured investigation results.

## 6. Component Responsibilities (Planned Architecture)

### Developer Machine
Runs the ColdProof CLI. This is where all execution and verification takes place.

### ColdProof CLI
- **Warm Execution**: Runs the project normally.
- **Clean Docker Execution**: Runs the project in an isolated container.
- **Candidate Detection**: Identifies environmental differences.
- **Controlled Perturbation**: Modifies the environment deterministically.
- **Failure-Signature Comparison**: Compares the outputs/exit codes.
- **Evidence Classification**: Confirms, suspects, or rejects candidates based on evidence.

### Structured Investigation JSON
The standard output of a CLI investigation, uploaded to the backend.

### Backend API
- Built with Fastify.
- Exposes endpoints to receive and serve investigation JSON payloads.

### PostgreSQL
- Stores investigations and environment contracts.
- Interacted with via Prisma ORM.

### Dashboard
- Built with Next.js.
- Visualizes the investigation results, causal diffs, and environment contracts.

## 7. Deployment Architecture (Planned)
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Supabase PostgreSQL
- **Source Control**: GitHub

## 8. Security Boundary
The backend only receives JSON payloads. It does not run user code. The CLI executes user code, but only on the developer's local machine or within a local Docker container. 

## 9. Hackathon Simplifications
For the hackathon MVP, there is no authentication. The CLI generates an investigation UUID and uploads the result. The backend stores it, and the dashboard exposes it via a public URL (`/investigation/<uuid>`).

---
*Note: This architecture describes the planned end-state. Currently, only the project foundation is implemented.*
