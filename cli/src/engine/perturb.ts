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

export function normalizeOutput(text: string): string {
  // Strip absolute temporary paths, e.g., /tmp/coldproof-block-XYZ/ or /var/folders/...
  let normalized = text.replace(/(?:\/tmp|\/var\/folders)[a-zA-Z0-9_/-]+/g, '<TEMP_PATH>');
  
  // Strip ColdProof's own block message to ensure we don't accidentally match it 
  // as if it was a genuine missing executable error from the system.
  normalized = normalized.replace(/coldproof: executable '.*?' blocked by perturbation\n?/g, '');

  return normalized.trim();
}

export function analyzeFailureSignatures(clean: ExecutionResult, perturbed: ExecutionResult): { sameExitCode: boolean, failureOutputComparable: boolean } {
  // If either succeeded, it's not a failure signature match
  if (clean.exitCode === 0 || perturbed.exitCode === 0) {
    return { sameExitCode: false, failureOutputComparable: false };
  }

  const sameExitCode = clean.exitCode === perturbed.exitCode;
  
  // Normalize output
  const cleanStderr = normalizeOutput(clean.stderr);
  const perturbedStderr = normalizeOutput(perturbed.stderr);

  // Consider them comparable if they have identical normalized stderr output,
  // or if one is completely contained within the other (to account for minor wrapping differences).
  // Empty outputs are only comparable if both are empty.
  const failureOutputComparable = cleanStderr === perturbedStderr || 
    (cleanStderr.length > 0 && perturbedStderr.includes(cleanStderr)) ||
    (perturbedStderr.length > 0 && cleanStderr.includes(perturbedStderr));

  return { sameExitCode, failureOutputComparable };
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
      sameExitCode: false,
      failureOutputComparable: false,
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
    const { sameExitCode, failureOutputComparable } = analyzeFailureSignatures(clean, perturbedWarm);

    let classification: PerturbationEvidence['classification'] = 'UNABLE_TO_TEST';
    let explanation = '';

    if (!cleanFailed) {
      classification = 'UNABLE_TO_TEST';
      explanation = 'Clean environment did not fail, so we cannot match a failure signature.';
    } else if (!perturbedFailed) {
      classification = 'NOT_IMPLICATED';
      explanation = 'Perturbed environment succeeded, meaning this candidate is not the cause of the failure.';
    } else if (sameExitCode && failureOutputComparable) {
      classification = 'CONFIRMED';
      explanation = 'Perturbation successfully reproduced both the exit code and failure output of the clean environment.';
    } else if (sameExitCode) {
      classification = 'STRONG_EVIDENCE';
      explanation = 'Blocking the candidate reproduced a failure with the same exit boundary as the clean run, but the failure text differs.';
    } else {
      classification = 'NOT_IMPLICATED';
      explanation = 'Perturbed environment failed, but the exit code did not match the clean environment.';
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
        sameExitCode,
        failureOutputComparable,
        explanation,
      },
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
