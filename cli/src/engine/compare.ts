import type {
  ExecutionResult,
  ComparisonResult,
  ComparisonClassification,
} from '../types.js';

export function compareExecutions(
  warm: ExecutionResult,
  clean: ExecutionResult
): ComparisonResult {
  const warmSuccess = warm.exitCode === 0;
  const cleanSuccess = clean.exitCode === 0;

  let classification: ComparisonClassification;
  if (warmSuccess && cleanSuccess) {
    classification = 'BOTH_PASS';
  } else if (!warmSuccess && !cleanSuccess) {
    classification = 'BOTH_FAIL';
  } else if (warmSuccess && !cleanSuccess) {
    classification = 'WARM_PASS_CLEAN_FAIL';
  } else {
    classification = 'WARM_FAIL_CLEAN_PASS';
  }

  const behaviorChanged = warmSuccess !== cleanSuccess;

  const result: ComparisonResult = {
    warm,
    clean,
    behaviorChanged,
    classification,
  };

  if (behaviorChanged) {
    result.failureSignature = {
      command: warm.command,
      warmExitCode: warm.exitCode,
      cleanExitCode: clean.exitCode,
      warmStdout: warm.stdout,
      cleanStdout: clean.stdout,
      warmStderr: warm.stderr,
      cleanStderr: clean.stderr,
      warmDurationMs: warm.durationMs,
      cleanDurationMs: clean.durationMs,
      timestamp: new Date().toISOString(),
    };
  }

  return result;
}
