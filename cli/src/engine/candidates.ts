import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { EnvironmentCandidate } from '../types.js';
import { executeCleanCommand } from './executeClean.js';

const execAsync = promisify(exec);

const BINARY_ALLOWLIST = ['jq', 'curl', 'git', 'psql', 'python', 'python3', 'node', 'npm'];
const ENV_ALLOWLIST = new Set(['DATABASE_URL', 'API_URL', 'NODE_ENV', 'CI', 'PORT', 'HOST', 'DEBUG', 'COLDPROOF_TEST_FLAG']);

export async function detectCandidates(command: string, projectPath: string): Promise<EnvironmentCandidate[]> {
  const candidates: EnvironmentCandidate[] = [];

  // --- A. Runtime Version Probe ---
  const warmNodeVer = (await execAsync('node -v')).stdout.trim();
  let cleanNodeVer = '';
  try {
    const res = await executeCleanCommand('node -v', projectPath);
    cleanNodeVer = res.stdout.trim();
  } catch {
    cleanNodeVer = 'unknown';
  }

  if (warmNodeVer !== cleanNodeVer) {
    candidates.push({
      id: 'RUNTIME_VERSION:node',
      type: 'RUNTIME_VERSION',
      name: 'node',
      warmValue: warmNodeVer,
      cleanValue: cleanNodeVer,
      reason: 'Node.js runtime versions differ between warm and clean execution.',
    });
  }

  // --- B. Environment Variable Probe ---
  const warmEnvKeys = Object.keys(process.env);
  let cleanEnvOutput = '';
  try {
    const res = await executeCleanCommand('env', projectPath);
    cleanEnvOutput = res.stdout;
  } catch (err) {
    // ignore
  }
  const cleanEnvKeys = cleanEnvOutput
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => line.split('=')[0]);

  const cleanEnvSet = new Set(cleanEnvKeys);

  for (const key of warmEnvKeys) {
    if (!ENV_ALLOWLIST.has(key)) continue; // MVP: strict allowlist to avoid noise
    
    if (!cleanEnvSet.has(key)) {
      candidates.push({
        id: `ENVIRONMENT_VARIABLE:${key}`,
        type: 'ENVIRONMENT_VARIABLE',
        name: key,
        warmValue: true, // Only presence is stored
        cleanValue: false,
        reason: 'Environment variable is present in the warm environment but absent in the clean environment.',
      });
    }
  }

  // --- C. Executable / Binary Probe (PATH Shim) ---
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coldproof-shim-'));
  const logFile = path.join(tmpDir, 'invocations.log');

  try {
    // Generate shims
    for (const bin of BINARY_ALLOWLIST) {
      // Find the absolute path to the real binary on the host
      let realPath = '';
      try {
        realPath = (await execAsync(`which ${bin}`)).stdout.trim();
      } catch {
        continue; // If it's not even on the host, no need to shim it
      }
      
      if (!realPath) continue;

      const shimPath = path.join(tmpDir, bin);
      const shimScript = `#!/usr/bin/env bash
echo "${bin}" >> "${logFile}"
exec "${realPath}" "$@"
`;
      fs.writeFileSync(shimPath, shimScript, { mode: 0o755 });
    }

    // Execute with shimmed PATH
    console.log('\\n[ColdProof MVP] Re-executing command on host to gather invocation telemetry (instrumentation pass)...');
    const env = { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` };
    await new Promise((resolve) => {
      const child = spawn(command, { shell: true, env, stdio: 'ignore' });
      child.on('close', resolve);
      child.on('error', resolve);
    });

    let invokedBinaries: string[] = [];
    if (fs.existsSync(logFile)) {
      const logContents = fs.readFileSync(logFile, 'utf-8');
      invokedBinaries = [...new Set(logContents.split('\n').filter(Boolean))];
    }

    for (const bin of invokedBinaries) {
      // Check if it exists in clean
      let existsInClean = false;
      try {
        const res = await executeCleanCommand(`which ${bin}`, projectPath);
        existsInClean = res.exitCode === 0 && res.stdout.trim().length > 0;
      } catch {
        existsInClean = false;
      }

      if (!existsInClean) {
        candidates.push({
          id: `EXECUTABLE:${bin}`,
          type: 'EXECUTABLE',
          name: bin,
          warmValue: true,
          cleanValue: false,
          observed: true,
          reason: 'Executable is available in the warm environment but unavailable in the clean environment.',
        });
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return candidates;
}
