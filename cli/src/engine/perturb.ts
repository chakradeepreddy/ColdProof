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

export function isMissingCommandError(stderr: string, candidateName: string): boolean {
  const out = stderr.toLowerCase();
  const target = candidateName.toLowerCase();
  const missingIndicators = [
    `${target}: not found`,
    `${target}: command not found`,
    `'${target}' is not recognized`,
    `spawn ${target} enoent`
  ];
  return missingIndicators.some(indicator => out.includes(indicator));
}

export function analyzeFailureSignatures(clean: ExecutionResult, perturbed: ExecutionResult, candidateName?: string): { sameExitCode: boolean, failureOutputComparable: boolean, equivalentMissingBoundary: boolean } {
  // If either succeeded, it's not a failure signature match
  if (clean.exitCode === 0 || perturbed.exitCode === 0) {
    return { sameExitCode: false, failureOutputComparable: false, equivalentMissingBoundary: false };
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

  const equivalentMissingBoundary = candidateName 
    ? (isMissingCommandError(cleanStderr, candidateName) && isMissingCommandError(perturbedStderr, candidateName))
    : false;

  return { sameExitCode, failureOutputComparable, equivalentMissingBoundary };
}

import { executeCleanCommand } from './executeClean.js';

function didCandidateFailureDisappear(clean: ExecutionResult, perturbed: ExecutionResult, candidateName: string): boolean {
  const cleanOut = (clean.stderr + '\n' + clean.stdout).toLowerCase();
  const perturbedOut = (perturbed.stderr + '\n' + perturbed.stdout).toLowerCase();

  const target = candidateName.toLowerCase();

  const missingIndicators = [
    `${target}: not found`,
    `${target}: command not found`,
    `'${target}' is not recognized`,
    `spawn ${target} enoent`
  ];

  const wasMissingInClean = missingIndicators.some(indicator => cleanOut.includes(indicator));
  const isMissingInPerturbed = missingIndicators.some(indicator => perturbedOut.includes(indicator));

  return wasMissingInClean && !isMissingInPerturbed;
}

export async function perturbCandidate(
  candidate: EnvironmentCandidate,
  command: string,
  originalWarm: ExecutionResult,
  clean: ExecutionResult,
  comparison: ComparisonResult,
  projectPath: string
): Promise<PerturbationResult> {
  const defaultResult: PerturbationResult = {
    candidate,
    originalWarm,
    clean,
    perturbedWarm: null,
    evidence: {
      classification: 'NO_ENVIRONMENT_CAUSE_FOUND',
      candidateObserved: !!candidate.observed,
      candidatePerturbed: false,
      cleanFailed: clean.exitCode !== 0,
      perturbedFailed: false,
      sameExitCode: false,
      failureOutputComparable: false,
      explanation: 'Candidate type not supported for perturbation.',
    },
  };

  if (candidate.type !== 'EXECUTABLE' && candidate.type !== 'PROJECT_LOCAL_EXECUTABLE') {
    return defaultResult;
  }

  // --- Perturbation Logic ---
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coldproof-block-'));

  try {
    let perturbedWarm: ExecutionResult;
    let classification: PerturbationEvidence['classification'] = 'NO_ENVIRONMENT_CAUSE_FOUND';
    let explanation = '';
    let sameExitCode = false;
    let failureOutputComparable = false;
    let cleanFailed = clean.exitCode !== 0;
    let perturbedFailed = false;

    if (candidate.type === 'PROJECT_LOCAL_EXECUTABLE') {
      console.log(`\n   Blocking ${candidate.name} in warm environment...`);
      
      const binDir = path.join(projectPath, 'node_modules', '.bin');
      const blockedFiles: { original: string, blocked: string }[] = [];
      
      if (fs.existsSync(binDir)) {
        const files = fs.readdirSync(binDir);
        for (const file of files) {
          // Block the main executable and any Windows shims (.cmd, .ps1)
          if (file === candidate.name || file.startsWith(`${candidate.name}.`)) {
            const original = path.join(binDir, file);
            const blocked = path.join(binDir, `${file}.coldproof-blocked`);
            fs.renameSync(original, blocked);
            blockedFiles.push({ original, blocked });
          }
        }
      }

      try {
        perturbedWarm = await executeCommand(command, process.env);
      } finally {
        for (const { original, blocked } of blockedFiles) {
          if (fs.existsSync(blocked)) {
            fs.renameSync(blocked, original);
          }
        }
      }

      console.log(`   ✓ Perturbation applied`);

      perturbedFailed = perturbedWarm.exitCode !== 0;
      const analysis = analyzeFailureSignatures(clean, perturbedWarm, candidate.name);
      sameExitCode = analysis.sameExitCode;
      failureOutputComparable = analysis.failureOutputComparable;

      if (!cleanFailed) {
        classification = 'NO_ENVIRONMENT_CAUSE_FOUND';
        explanation = 'Clean environment did not fail, so we cannot perform a perturbation test.';
      } else if (!perturbedFailed) {
        classification = 'NOT_IMPLICATED';
        explanation = 'Perturbed environment succeeded, meaning this candidate is not the cause of the failure.';
      } else if (analysis.equivalentMissingBoundary) {
        classification = 'STRONG_EVIDENCE';
        explanation = 'Removing this local dependency reproduced an equivalent "command not found" failure across platform boundaries.';
      } else if (sameExitCode && failureOutputComparable) {
        classification = 'CONFIRMED';
        explanation = 'Removing this local dependency reproduced the exact failure in the warm environment.';
      } else if (sameExitCode) {
        classification = 'STRONG_EVIDENCE';
        explanation = 'Removing this local dependency reproduced a similar failure in the warm environment.';
      } else if (didCandidateFailureDisappear(clean, perturbedWarm, candidate.name)) {
        classification = 'PARTIAL_EVIDENCE';
        explanation = 'Removing this local dependency caused the original failure to disappear, but the command failed for another reason.';
      } else {
        classification = 'NOT_IMPLICATED';
        explanation = 'Perturbed environment failed, but the exit code did not match the clean environment.';
      }

    } else {
      // EXECUTABLE (PATH Blocking Shim in warm environment)
      if (process.platform === 'win32') {
        const shimPath = path.join(tmpDir, `${candidate.name}.cmd`);
        const shimScript = `@echo off\r\necho coldproof: executable '${candidate.name}' blocked by perturbation 1>&2\r\nexit /b 127\r\n`;
        fs.writeFileSync(shimPath, shimScript);
      } else {
        const shimPath = path.join(tmpDir, candidate.name);
        const shimScript = `#!/bin/sh\necho "coldproof: executable '${candidate.name}' blocked by perturbation" >&2\nexit 127\n`;
        fs.writeFileSync(shimPath, shimScript, { mode: 0o755 });
      }

      console.log(`\n   Blocking ${candidate.name} in warm environment...`);

      // Execute with shimmed PATH
      const customEnv = { ...process.env };
      customEnv.PATH = `${tmpDir}${path.delimiter}${process.env.PATH}`;
      perturbedWarm = await executeCommand(command, customEnv);

      console.log(`   ✓ Perturbation applied`);

      perturbedFailed = perturbedWarm.exitCode !== 0;
      const analysis = analyzeFailureSignatures(clean, perturbedWarm, candidate.name);
      sameExitCode = analysis.sameExitCode;
      failureOutputComparable = analysis.failureOutputComparable;

      if (!cleanFailed) {
        classification = 'NO_ENVIRONMENT_CAUSE_FOUND';
        explanation = 'Clean environment did not fail, so we cannot match a failure signature.';
      } else if (!perturbedFailed) {
        classification = 'NOT_IMPLICATED';
        explanation = 'Perturbed environment succeeded, meaning this candidate is not the cause of the failure.';
      } else if (analysis.equivalentMissingBoundary) {
        classification = 'STRONG_EVIDENCE';
        explanation = 'Blocking the candidate reproduced an equivalent "command not found" failure across platform boundaries.';
      } else if (sameExitCode && failureOutputComparable) {
        classification = 'CONFIRMED';
        explanation = 'Perturbation successfully reproduced both the exit code and failure output of the clean environment.';
      } else if (sameExitCode) {
        classification = 'STRONG_EVIDENCE';
        explanation = 'Blocking the candidate reproduced a failure with the same exit boundary as the clean run, but the failure text differs.';
      } else if (didCandidateFailureDisappear(clean, perturbedWarm, candidate.name)) {
        classification = 'PARTIAL_EVIDENCE';
        explanation = 'Blocking the candidate caused the original failure to disappear, but the command failed for another reason.';
      } else {
        classification = 'NOT_IMPLICATED';
        explanation = 'Perturbed environment failed, but the exit code did not match the clean environment.';
      }
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
