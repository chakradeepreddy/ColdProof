import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type {
  EnvironmentCandidate,
  ExecutionResult,
  ComparisonResult,
  PerturbationResult,
  PerturbationEvidence,
} from '../types.js';
import { executeCommand } from './execute.js';

function matchFailureSignatures(clean: ExecutionResult, perturbed: ExecutionResult): boolean {
  // If either succeeded, it's not a failure signature match
  if (clean.exitCode === 0 || perturbed.exitCode === 0) return false;

  // Compare exit codes
  if (clean.exitCode === perturbed.exitCode) {
    return true;
  }

  return false;
}

export async function perturbCandidate(
  candidate: EnvironmentCandidate,
  command: string,
  originalWarm: ExecutionResult,
  clean: ExecutionResult,
  comparison: ComparisonResult
): Promise<PerturbationResult> {
  const defaultResult: PerturbationResult = {
    candidate,
    originalWarm,
    clean,
    perturbedWarm: null,
    evidence: {
      classification: 'UNABLE_TO_TEST',
      candidateObserved: !!candidate.observed,
      candidatePerturbed: false,
      cleanFailed: clean.exitCode !== 0,
      perturbedFailed: false,
      failureSignatureMatched: false,
      explanation: 'Candidate type not supported for perturbation.',
    },
  };

  if (candidate.type !== 'EXECUTABLE') {
    return defaultResult;
  }

  // --- Executable Perturbation (PATH Blocking Shim) ---
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coldproof-block-'));

  try {
    const shimPath = path.join(tmpDir, candidate.name);
    // Write a blocking shim that mimics a 'not found' error with exit code 127
    const shimScript = `#!/usr/bin/env bash
echo "coldproof: executable '${candidate.name}' blocked by perturbation" >&2
exit 127
`;
    fs.writeFileSync(shimPath, shimScript, { mode: 0o755 });

    console.log(`\n   Blocking ${candidate.name} in warm environment...`);

    // Execute with shimmed PATH
    const customEnv = { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` };
    const perturbedWarm = await executeCommand(command, customEnv);

    console.log(`   ✓ Perturbation applied`);

    const perturbedFailed = perturbedWarm.exitCode !== 0;
    const cleanFailed = clean.exitCode !== 0;
    const failureSignatureMatched = matchFailureSignatures(clean, perturbedWarm);

    let classification: PerturbationEvidence['classification'] = 'UNABLE_TO_TEST';
    let explanation = '';

    if (!cleanFailed) {
      classification = 'UNABLE_TO_TEST';
      explanation = 'Clean environment did not fail, so we cannot match a failure signature.';
    } else if (!perturbedFailed) {
      classification = 'NOT_IMPLICATED';
      explanation = 'Perturbed environment succeeded, meaning this candidate is not the cause of the failure.';
    } else if (failureSignatureMatched) {
      // Both failed and signatures matched (exit code 127 for missing executable)
      classification = 'STRONG_EVIDENCE';
      explanation = 'Perturbation successfully reproduced the failure signature of the clean environment.';
    } else {
      classification = 'NOT_IMPLICATED';
      explanation = 'Perturbed environment failed, but the failure signature did not match the clean environment.';
    }

    return {
      candidate,
      originalWarm,
      clean,
      perturbedWarm,
      evidence: {
        classification,
        candidateObserved: !!candidate.observed,
        candidatePerturbed: true,
        cleanFailed,
        perturbedFailed,
        failureSignatureMatched,
        explanation,
      },
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
