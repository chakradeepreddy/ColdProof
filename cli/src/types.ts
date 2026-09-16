export interface ExecutionResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

export type ComparisonClassification = 
  | 'BOTH_PASS'
  | 'BOTH_FAIL'
  | 'WARM_PASS_CLEAN_FAIL'
  | 'WARM_FAIL_CLEAN_PASS';

export interface EnvironmentalFailureSignature {
  command: string;
  warmExitCode: number | null;
  cleanExitCode: number | null;
  warmStdout: string;
  cleanStdout: string;
  warmStderr: string;
  cleanStderr: string;
  warmDurationMs: number;
  cleanDurationMs: number;
  timestamp: string;
}

export interface ComparisonResult {
  warm: ExecutionResult;
  clean: ExecutionResult;
  behaviorChanged: boolean;
  classification: ComparisonClassification;
  failureSignature?: EnvironmentalFailureSignature;
}

export type CandidateType =
  | 'EXECUTABLE'
  | 'RUNTIME_VERSION'
  | 'ENVIRONMENT_VARIABLE';

export interface EnvironmentCandidate {
  id: string; // e.g. "EXECUTABLE:jq"
  type: CandidateType;
  name: string;
  warmValue?: string | boolean;
  cleanValue?: string | boolean;
  observed?: boolean;
  reason: string;
}

export interface PerturbationEvidence {
  classification: 'CONFIRMED' | 'STRONG_EVIDENCE' | 'NOT_IMPLICATED' | 'UNABLE_TO_TEST';
  candidateObserved: boolean;
  candidatePerturbed: boolean;
  cleanFailed: boolean;
  perturbedFailed: boolean;
  failureSignatureMatched: boolean;
  explanation: string;
}

export interface PerturbationResult {
  candidate: EnvironmentCandidate;
  originalWarm: ExecutionResult;
  clean: ExecutionResult;
  perturbedWarm: ExecutionResult | null;
  evidence: PerturbationEvidence;
}
