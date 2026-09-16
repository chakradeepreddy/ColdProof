import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import cors from '@fastify/cors';

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

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, {
  origin: true, // Allow all origins for MVP
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
    // Return 404 to avoid leaking existence of projects belonging to others
    return reply.status(404).send({ error: 'Project not found' });
  }

  const investigation = await prisma.investigation.create({
    data: {
      projectId: body.projectId,
      command: body.command,
      comparison: body.comparison,
      candidates: body.candidates,
      perturbation: body.perturbationResult || null,
    },
  });

  return reply.status(201).send({
    id: investigation.id,
    createdAt: investigation.createdAt,
  });
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

  // Verify existence (ownership is handled by the query)
  if (!investigation) {
    return reply.status(404).send({ error: 'Investigation not found' });
  }

  return investigation;
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
