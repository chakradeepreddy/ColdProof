import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import cors from '@fastify/cors';
import Groq from 'groq-sdk';

dotenv.config();

// Define types extending FastifyRequest for authenticated routes
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      firebaseUid: string;
      email: string | null;
    };
  }
}

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Firebase Admin SDK if credentials are provided
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
} else {
  console.warn('Firebase Admin SDK configuration is incomplete. Authentication will fail.');
}

// Initialize Groq (optional — if GROQ_API_KEY is absent, AI explanation is skipped)
let groqClient: Groq | null = null;
const groqApiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
if (groqApiKey) {
  groqClient = new Groq({ apiKey: groqApiKey });
  console.log(`Groq client initialized. Model: ${groqModel}`);
} else {
  console.log('GROQ_API_KEY not set — AI explanation disabled.');
}

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
});

// Authentication hook
fastify.decorateRequest('user', null as any);

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid: firebaseUid, email = null } = decodedToken;

    // Upsert user in PostgreSQL
    let user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid,
          email,
        },
      });
    }

    request.user = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(401).send({ error: 'Invalid or expired Firebase token' });
  }
}

// ------------------------------------------------------------------
// GROQ EXPLANATION HELPER
// Generates a plain-English explanation from structured evidence.
// Never determines causality — only explains what the engine found.
// ------------------------------------------------------------------
async function generateExplanation(inv: {
  command: string;
  comparison: any;
  candidates: any[];
  perturbation: any;
}): Promise<string | null> {
  if (!groqClient) return null;

  const { command, comparison, candidates, perturbation } = inv;

  // Build a safe, sanitized summary for the AI — no secrets, no credentials
  const warmStatus = comparison?.warm?.exitCode === 0 ? 'PASS (exit 0)' : `FAIL (exit ${comparison?.warm?.exitCode})`;
  const cleanStatus = comparison?.clean?.exitCode === 0 ? 'PASS (exit 0)' : `FAIL (exit ${comparison?.clean?.exitCode})`;
  const classification = comparison?.classification ?? 'UNKNOWN';
  const candidateNames = (candidates ?? []).map((c: any) => c.name).join(', ') || 'none';

  // Perturbation summary — use perturbedWarm (actual stored field name)
  let perturbationSummary = 'No perturbation performed.';
  if (perturbation) {
    const candidate = perturbation.candidate?.name ?? 'unknown';
    const evidence = perturbation.evidence?.classification ?? 'UNKNOWN';
    const perturbedExitCode = perturbation.perturbedWarm?.exitCode;
    perturbationSummary = `Candidate "${candidate}" was blocked. Perturbed execution: exit ${perturbedExitCode ?? 'unknown'}. Evidence: ${evidence}.`;
  }

  // Truncate stderr to avoid sending huge outputs
  const cleanStderr = (comparison?.clean?.stderr ?? '').slice(0, 600);
  const warmStderr = (comparison?.warm?.stderr ?? '').slice(0, 400);

  const systemPrompt = `You are a very good senior engineer explaining a ColdProof investigation to a first-year programming student.
ColdProof is an environment causality debugger. It finds why a command works on one computer but fails on another by running controlled experiments.

Your goal is to explain exactly what ColdProof did, what it found, and what the evidence means, so a beginner can understand it perfectly.

CRITICAL RULES:
1. Explain technical terms immediately in simple words (e.g., "PATH is simply the list of folders where the computer looks for programs").
2. Use short sentences and short paragraphs. Be beginner-friendly.
3. NEVER claim a difference caused the failure just because it is different. ColdProof only proves causality through experiments.
4. ONLY give next steps that are actually supported by the specific evidence found in this investigation.
5. You MUST use EXACTLY the following Markdown structure and headings for your explanation:

### What happened
Explain the situation simply. Start from the command they ran. State if it worked locally but failed in the clean environment (or vice versa).

### What differed
List the specific environment differences ColdProof found. Explain them simply. Use phrases like "ColdProof found this difference and treated it as a candidate cause."

### What ColdProof tested
Explain the experiment like a simple science experiment. (e.g., "ColdProof temporarily removed/restored [candidate] in the clean environment and ran the command again. This asks: 'If we fix this piece, does the failure disappear?'")

### What the evidence means
Explain the logical chain visually or in simple text (What we saw → What we suspected → What we tested → What happened → What we conclude).
YOU MUST STRICTLY USE THESE DEFINITIONS BASED ON THE EVIDENCE CLASSIFICATION:
- CONFIRMED: "ColdProof reproduced the failure by changing this candidate. This is strong experimental evidence that this environmental difference is responsible for the failure."
- STRONG_EVIDENCE: "ColdProof found strong evidence connecting this environment difference to the failure, based on the observed difference and execution results."
- PARTIAL_EVIDENCE: "This candidate was involved in the failure, but fixing/removing/restoring it did not completely make the command succeed. The command progressed further or the original candidate-specific failure disappeared, but another failure remained." (Never call this a root cause).
- NOT_IMPLICATED: "ColdProof tested this candidate, but changing it did not reproduce the failure. The evidence therefore does not support this candidate as the cause."
- NO_ENVIRONMENT_CAUSE_FOUND: "ColdProof could not find an environment difference that it could experimentally connect to the failure."

### Next steps
Give practical, specific steps based ONLY on the evidence. Explain what to check/change, why, and what to run next. Do not give generic advice.`;

  const userPrompt = `ColdProof investigation for command: ${JSON.stringify(command)}

Warm (local machine): ${warmStatus}
Clean (Docker container): ${cleanStatus}
Behavioral classification: ${classification}
Environment candidates detected: ${candidateNames}
Perturbation result: ${perturbationSummary}

Warm stderr (truncated): ${warmStderr || '(none)'}
Clean stderr (truncated): ${cleanStderr || '(none)'}

Please generate the plain-English explanation following the strict Markdown structure requested.`;

  try {
    const completion = await groqClient.chat.completions.create({
      model: groqModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });
    return completion.choices[0]?.message?.content ?? null;
  } catch (err: any) {
    console.error('Groq explanation failed:', err?.message ?? err);
    return null;
  }
}

// ------------------------------------------------------------------
// PUBLIC ENDPOINTS
// ------------------------------------------------------------------

fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const DEMO_INVESTIGATION_IDS: string[] = [
  '81f31619-cb56-46ff-b761-47e24429429e',
  'a2a0f0d4-68ce-4360-bf32-555342a393c1',
  '390751c1-5cc1-4119-b1a8-28a1e9647d63',
  'cb645205-8f8e-4626-9891-ce87d27708ed',
  '382f4eb1-f07e-4f8d-b145-7b81f30fd0e5',
  'cc53abb3-15bc-4df9-abc7-9a2122bb5b6d',
  '3ae0031f-4ba4-490b-a140-c7527f354fc9',
  '587f8b62-0ded-4a35-b90e-588b1d4879d8',
  'a20440d6-841b-482e-a195-aaae22959649',
  'cfc9dc13-5bf6-4d4a-aa72-3a863aec5d7c',
  '4aca3df7-e691-431e-8cbd-b016dcec42bc',
  '85746012-db49-4d75-9eeb-6f6fd83558e4'
];

fastify.get('/api/demo/investigations', async (request, reply) => {
  const investigations = await prisma.investigation.findMany({
    where: {
      id: { in: DEMO_INVESTIGATION_IDS }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Redact private fields
  return investigations.map(inv => ({
    id: inv.id,
    command: inv.command,
    projectName: inv.projectName,
    comparison: inv.comparison,
    candidates: inv.candidates,
    perturbation: inv.perturbation,
    aiExplanation: inv.aiExplanation,
    createdAt: inv.createdAt,
  }));
});

fastify.get('/api/demo/investigations/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  if (!DEMO_INVESTIGATION_IDS.includes(id)) {
    return reply.status(404).send({ error: 'Demo investigation not found or not allowlisted' });
  }

  const inv = await prisma.investigation.findUnique({
    where: { id }
  });

  if (!inv) {
    return reply.status(404).send({ error: 'Demo investigation not found' });
  }

  // Redact private fields
  return {
    id: inv.id,
    command: inv.command,
    projectName: inv.projectName,
    comparison: inv.comparison,
    candidates: inv.candidates,
    perturbation: inv.perturbation,
    aiExplanation: inv.aiExplanation,
    createdAt: inv.createdAt,
  };
});

// ------------------------------------------------------------------
// PROTECTED ENDPOINTS
// ------------------------------------------------------------------

fastify.get('/api/me', { preHandler: authenticate }, async (request, reply) => {
  return request.user;
});

fastify.get('/api/projects', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user!.id;
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return projects;
});

fastify.post('/api/projects', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user!.id;
  const body = request.body as any;
  
  if (!body || !body.name || typeof body.name !== 'string') {
    return reply.status(400).send({ error: 'Invalid request: name is required' });
  }

  const project = await prisma.project.create({
    data: {
      name: body.name,
      userId,
    },
  });

  return reply.status(201).send(project);
});

const investigationBodySchema = {
  type: 'object',
  required: ['projectId', 'command', 'comparison'],
  properties: {
    projectId: { type: 'string' },
    projectName: { type: 'string' },
    command: { type: 'string' },
    comparison: {
      type: 'object',
      required: ['warm', 'clean', 'behaviorChanged', 'classification'],
      properties: {
        warm: { type: 'object' },
        clean: { type: 'object' },
        behaviorChanged: { type: 'boolean' },
        classification: { type: 'string' },
      }
    },
    candidates: { type: 'array' },
    perturbationResult: { type: 'object', nullable: true },
  }
};

fastify.post('/api/investigations', { 
  preHandler: authenticate,
  schema: {
    body: investigationBodySchema
  }
}, async (request, reply) => {
  const userId = request.user!.id;
  const body = request.body as any;

  // Ensure the project belongs to the user
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
  });

  if (!project || project.userId !== userId) {
    return reply.status(403).send({ error: 'Project access denied' });
  }

  // Generate AI explanation asynchronously if Groq is configured
  let aiExplanation: string | null = null;
  if (groqClient && body.comparison?.behaviorChanged) {
    aiExplanation = await generateExplanation({
      command: body.command,
      comparison: body.comparison,
      candidates: body.candidates,
      perturbation: body.perturbationResult,
    });
  }

  const investigation = await prisma.investigation.create({
    data: {
      projectId: body.projectId,
      projectName: body.projectName || null,
      command: body.command,
      comparison: body.comparison,
      candidates: body.candidates,
      perturbation: body.perturbationResult || null,
      aiExplanation,
    },
  });

  return reply.status(201).send({
    id: investigation.id,
    createdAt: investigation.createdAt,
  });
});

fastify.get('/api/investigations', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user!.id;
  
  const investigations = await prisma.investigation.findMany({
    where: {
      project: {
        userId: userId
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return investigations;
});

fastify.get('/api/investigations/:id', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user!.id;
  const { id } = request.params as { id: string };

  const investigation = await prisma.investigation.findFirst({
    where: { 
      id,
      project: {
        userId: userId
      }
    }
  });

  if (!investigation) {
    return reply.status(404).send({ error: 'Investigation not found' });
  }

  return investigation;
});

// Regenerate AI explanation for an existing investigation (idempotent)
fastify.post('/api/investigations/:id/explain', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user!.id;
  const { id } = request.params as { id: string };

  if (!groqClient) {
    return reply.status(503).send({ error: 'AI explanation service not configured.' });
  }

  const investigation = await prisma.investigation.findFirst({
    where: { id, project: { userId } }
  });

  if (!investigation) {
    return reply.status(404).send({ error: 'Investigation not found' });
  }

  const explanation = await generateExplanation({
    command: investigation.command,
    comparison: investigation.comparison,
    candidates: investigation.candidates as any[],
    perturbation: investigation.perturbation,
  });

  if (!explanation) {
    return reply.status(500).send({ error: 'Failed to generate explanation.' });
  }

  const updated = await prisma.investigation.update({
    where: { id },
    data: { aiExplanation: explanation },
  });

  return { aiExplanation: updated.aiExplanation };
});

fastify.delete('/api/investigations/:id', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user!.id;
  const { id } = request.params as { id: string };

  const investigation = await prisma.investigation.findFirst({
    where: { id, project: { userId } }
  });

  if (!investigation) {
    return reply.status(404).send({ error: 'Investigation not found' });
  }

  await prisma.investigation.delete({ where: { id } });
  return reply.status(200).send({ deleted: true });
});

// Start the server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
