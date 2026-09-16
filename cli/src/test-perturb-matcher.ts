import { analyzeFailureSignatures, normalizeOutput } from './engine/perturb.js';
import type { ExecutionResult } from './types.js';

function createMockResult(exitCode: number | null, stderr: string): ExecutionResult {
  return {
    command: 'dummy',
    stdout: '',
    stderr,
    exitCode,
    durationMs: 0
  };
}

let passed = true;

function runTest(name: string, cleanResult: ExecutionResult, perturbedResult: ExecutionResult, expectedSameExitCode: boolean, expectedComparable: boolean) {
  console.log(`Test: ${name}`);
  const result = analyzeFailureSignatures(cleanResult, perturbedResult);
  
  if (result.sameExitCode !== expectedSameExitCode || result.failureOutputComparable !== expectedComparable) {
    console.error(`  [FAIL] Expected { sameExitCode: ${expectedSameExitCode}, failureOutputComparable: ${expectedComparable} } but got`, result);
    passed = false;
  } else {
    console.log(`  [PASS]`);
  }
}

// CASE A: clean fails exit 127 with "jq: not found", perturbed fails exit 127 with ColdProof block message
runTest('Case A: 127 match, differing output', 
  createMockResult(127, 'jq: not found\n'), 
  createMockResult(127, "coldproof: executable 'jq' blocked by perturbation\n"), 
  true, 
  false
);

// CASE B: clean fails exit 127 with normalized equivalent failure, perturbed fails exit 127 with equivalent normalized failure
runTest('Case B: 127 match, equivalent output (with minor wrappers)', 
  createMockResult(127, 'Error: missing something\n'), 
  createMockResult(127, 'Error: missing something\n(this might be a wrapper)'), 
  true, 
  true
);

// CASE C: clean exit 127, perturbed exit 1
runTest('Case C: Exit codes differ', 
  createMockResult(127, 'not found'), 
  createMockResult(1, 'failed'), 
  false, 
  false
);

// CASE D: clean succeeds, perturbed fails
runTest('Case D: Clean succeeds', 
  createMockResult(0, ''), 
  createMockResult(1, 'failed'), 
  false, 
  false
);

if (!passed) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
