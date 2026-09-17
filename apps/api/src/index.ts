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

  const systemPrompt = `You are a plain-English technical assistant for ColdProof, an environment causality debugger. 
ColdProof uses controlled perturbation experiments to find which environment differences change a command's outcome.
Your role is ONLY to explain the evidence ColdProof already collected. 
Do NOT claim certainty beyond what the evidence supports. 
Do NOT add fake confidence percentages. 
Never upgrade or downgrade the evidence classification.
Never claim stronger causality than the supplied evidence level.
Do not infer causality from correlation alone.
Do not introduce facts that are not present in the supplied evidence.

Evidence Language Rules (You MUST follow these based on the Evidence level):
- CONFIRMED: You may state ColdProof confirmed the candidate is responsible.
- STRONG_EVIDENCE: State "The evidence strongly supports [candidate] as a contributor" or similar. DO NOT say "definitely caused", "directly attributable", "proven cause", "100% caused", "certain", or "guaranteed".
- SUSPECTED: State "[candidate] is a suspected environmental contributor, but the available evidence is not sufficient to establish causality."
- NOT_IMPLICATED: State the perturbation did not reproduce the observed failure and the candidate was not implicated.
- NO_ENVIRONMENT_CAUSE_FOUND: State ColdProof did not find sufficient evidence that an environmental difference caused the failure.

Be concise and developer-friendly. Maximum 5 short paragraphs.`;

  const userPrompt = `ColdProof investigation for command: ${JSON.stringify(command)}

Warm (local machine): ${warmStatus}
Clean (Docker container): ${cleanStatus}
Behavioral classification: ${classification}
Environment candidates detected: ${candidateNames}
Perturbation result: ${perturbationSummary}

Warm stderr (truncated): ${warmStderr || '(none)'}
Clean stderr (truncated): ${cleanStderr || '(none)'}

Explain: (1) what happened, (2) what was different between environments, (3) what ColdProof tested, (4) what the evidence supports (strictly following the Evidence Language Rules for the reported classification), (5) what the developer should check next. Keep it brief and honest about limitations.`;

  try {
    const completion = await groqClient.chat.completions.create({
      model: groqModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
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
  required: ['projectId', 'command', 'comparison', 'candidates'],
  properties: {
    projectId: { type: 'string' },
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
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'name', 'reason']
      }
    },
    perturbationResult: {
      type: ['object', 'null'],
      properties: {
        evidence: { type: 'object' }
      }
    }
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
    return reply.status(404).send({ error: 'Project not found' });
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
