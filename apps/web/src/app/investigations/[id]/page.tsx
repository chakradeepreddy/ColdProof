'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function ExitCodeBadge({ code }: { code: number | null | undefined }) {
  const pass = code === 0;
  return (
    <span className={cn('text-xs font-bold px-2 py-0.5 rounded', pass ? 'text-pass' : 'text-fail')}>
      Exit {code ?? '?'}
    </span>
  );
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0">
      <div className={cn(
        'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
        ok ? 'bg-pass/20 text-pass border border-pass/30' : 'bg-fail/15 text-fail border border-fail/20'
      )}>
        {ok ? '✓' : '✗'}
      </div>
      <div>
        <p className="text-sm font-semibold text-primary">{label}</p>
        <p className="text-xs text-secondary mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </li>
  );
}

function EvidenceBlock({ evidence, candidateName }: { evidence: any; candidateName?: string }) {
  const cls = evidence?.classification;
  const isConfirmed = cls === 'CONFIRMED';
  const isStrong = cls === 'STRONG_EVIDENCE';
  const isPartial = cls === 'PARTIAL_EVIDENCE';
  const isPositive = isConfirmed || isStrong || isPartial;

  return (
    <div className={cn(
      'rounded-lg border p-5 flex items-start gap-4 mt-5',
      isConfirmed ? 'bg-pass/8 border-pass/40' :
      (isStrong || isPartial) ? 'bg-evidence/8 border-evidence/40' :
      'bg-surface border-border'
    )}>
      <div className={cn(
        'p-2 rounded-full border flex-shrink-0',
        isConfirmed ? 'bg-pass/15 border-pass/40 text-pass' :
        (isStrong || isPartial) ? 'bg-evidence/15 border-evidence/40 text-evidence' :
        'bg-elevated border-border text-secondary'
      )}>
        {isConfirmed ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (isStrong || isPartial) ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <h5 className={cn(
          'font-bold text-sm tracking-wide uppercase',
          isConfirmed ? 'text-pass' : (isStrong || isPartial) ? 'text-evidence' : 'text-secondary'
        )}>
          {cls?.replace(/_/g, ' ') ?? 'UNKNOWN'}
        </h5>
        <p className="text-xs text-primary mt-1.5 leading-relaxed">
          {isConfirmed
            ? `${candidateName} is confirmed as the causal environmental factor.`
            : isStrong
            ? `${candidateName} strongly correlates with the failure. Exit codes matched; failure text varied slightly.`
            : isPartial
            ? `Restoring ${candidateName} allowed execution to progress further, but another failure occurred.`
            : `${candidateName} was perturbed but did not reproduce the clean failure signature.`}
        </p>
      </div>
    </div>
  );
}

function TerminalPanel({ label, exitCode, output, highlight }: {
  label: string;
  exitCode: number | null | undefined;
  output: string;
  highlight?: 'pass' | 'fail';
}) {
  const borderClass = highlight === 'pass' ? 'border-pass/25' : highlight === 'fail' ? 'border-fail/25' : 'border-border/50';
  return (
    <div className={cn('border rounded-lg overflow-hidden flex flex-col bg-[#08090A]', borderClass)}>
      <div className="px-4 py-2.5 border-b border-border/40 text-xs font-bold text-secondary uppercase tracking-widest flex justify-between items-center bg-surface/20">
        <span>{label}</span>
        <ExitCodeBadge code={exitCode} />
      </div>
      <pre className="p-4 text-xs font-mono text-primary/75 overflow-auto max-h-52 whitespace-pre-wrap leading-relaxed flex-grow">
        {output || <span className="text-secondary/50 italic">No output captured</span>}
      </pre>
    </div>
  );
}

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------

export default function CausalProofPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [investigation, setInvestigation] = useState<any>(null);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [requestingExplanation, setRequestingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return;
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setInvestigation(await res.json());
        } else {
          setError('Investigation not found or you do not have permission.');
        }
      } catch {
        setError('Failed to fetch investigation proof.');
      } finally {
        setLoadingData(false);
      }
    }
    if (user && !loading) fetchData();
  }, [user, loading, id, getToken]);

  const handleRequestExplanation = async () => {
    if (!investigation) return;
    setRequestingExplanation(true);
    setExplanationError('');
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations/${investigation.id}/explain`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvestigation((prev: any) => ({ ...prev, aiExplanation: data.aiExplanation }));
      } else {
        const err = await res.json().catch(() => ({}));
        setExplanationError(err.error || 'AI explanation unavailable.');
      }
    } catch {
      setExplanationError('AI explanation unavailable.');
    } finally {
      setRequestingExplanation(false);
    }
  };

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-experiment/30 border-t-experiment rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="bg-fail/8 border border-fail/25 p-8 rounded-lg text-center">
          <h2 className="text-lg font-bold text-fail mb-2">Not Found</h2>
          <p className="text-secondary text-sm">{error || 'Unknown error.'}</p>
          <Link href="/" className="inline-block mt-4 text-sm text-experiment hover:text-experiment/80 underline transition-colors">
            Return to Investigations
          </Link>
        </div>
      </div>
    );
  }

  const { command, comparison, candidates, perturbation, createdAt, aiExplanation } = investigation;
  const isBehaviorChanged = comparison?.behaviorChanged;
  const evidenceCls = perturbation?.evidence?.classification;

  // IST timestamp
  const dateUTC = new Date(createdAt);
  const dateIST = toZonedTime(dateUTC, 'Asia/Kolkata');
  const exactIST = format(dateIST, 'd MMM yyyy · h:mm a') + ' IST';
  const relative = formatDistanceToNow(dateUTC, { addSuffix: true });

  // Badge color for header
  const headerBadgeCls =
    evidenceCls === 'CONFIRMED' ? 'bg-pass/10 text-pass border-pass/30' :
    (evidenceCls === 'STRONG_EVIDENCE' || evidenceCls === 'PARTIAL_EVIDENCE') ? 'bg-evidence/10 text-evidence border-evidence/40' :
    evidenceCls === 'NOT_IMPLICATED' ? 'bg-secondary/10 text-secondary border-secondary/30' :
    !isBehaviorChanged ? 'bg-pass/10 text-pass border-pass/30' :
    'bg-fail/10 text-fail border-fail/30';

  const headerBadgeLabel =
    evidenceCls?.replace(/_/g, ' ') ?? (isBehaviorChanged ? 'DIVERGENCE' : 'NO DIVERGENCE');

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto w-full">

      {/* Back */}
      <Link href="/" className="inline-flex items-center text-secondary hover:text-primary text-sm mb-7 transition-colors">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Investigations
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold text-primary tracking-tight">Causal Proof</h1>
            <span className={cn('px-2.5 py-1 text-xs font-bold rounded uppercase tracking-widest border', headerBadgeCls)}>
              {headerBadgeLabel}
            </span>
          </div>
          <p className="text-secondary text-xs font-medium">
            <span title={exactIST}>{exactIST}</span>
            <span className="text-secondary/50 mx-1.5">·</span>
            <span className="text-secondary/70">{relative}</span>
          </p>
        </div>
        <code className="font-mono text-sm bg-[#08090A] border border-border/60 px-4 py-2.5 rounded-lg text-primary self-start shrink-0 max-w-full md:max-w-sm overflow-x-auto whitespace-nowrap">
          <span className="text-secondary/60 select-none">$ </span>{command}
        </code>
      </div>

      {/* Flow: REPRODUCE → PERTURB → PROVE */}
      <div className="flex items-center gap-2 mb-6 text-xs font-mono text-secondary/50 tracking-widest">
        <span className={cn('text-xs font-bold uppercase', isBehaviorChanged ? 'text-experiment' : 'text-secondary')}>REPRODUCE</span>
        <span>→</span>
        <span className={cn('text-xs font-bold uppercase', perturbation ? 'text-experiment' : 'text-secondary')}>PERTURB</span>
        <span>→</span>
        <span className={cn('text-xs font-bold uppercase',
          evidenceCls === 'CONFIRMED' ? 'text-pass' :
          (evidenceCls === 'STRONG_EVIDENCE' || evidenceCls === 'PARTIAL_EVIDENCE') ? 'text-evidence' :
          'text-secondary'
        )}>PROVE</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* 1. Reproduce */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-elevated/30">
            <h3 className="font-semibold text-primary text-sm tracking-wide">1 · Reproduce</h3>
            {isBehaviorChanged ? (
              <span className="text-xs text-fail font-bold flex items-center gap-1.5 bg-fail/10 px-2 py-0.5 rounded border border-fail/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Divergence
              </span>
            ) : (
              <span className="text-xs text-pass font-bold flex items-center gap-1.5 bg-pass/10 px-2 py-0.5 rounded border border-pass/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Consistent
              </span>
            )}
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TerminalPanel
              label="Warm (local)"
              exitCode={comparison?.warm?.exitCode}
              output={comparison?.warm?.stderr || comparison?.warm?.stdout || ''}
              highlight={comparison?.warm?.exitCode === 0 ? 'pass' : 'fail'}
            />
            <TerminalPanel
              label="Clean (Docker)"
              exitCode={comparison?.clean?.exitCode}
              output={comparison?.clean?.stderr || comparison?.clean?.stdout || ''}
              highlight={comparison?.clean?.exitCode === 0 ? 'pass' : 'fail'}
            />
          </div>
        </div>

        {/* 2. Candidates */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-elevated/30">
            <h3 className="font-semibold text-primary text-sm tracking-wide">2 · Candidate Detection</h3>
            <span className="text-xs font-bold text-secondary">{candidates?.length ?? 0} found</span>
          </div>
          <div className="p-4 overflow-auto max-h-64">
            {!candidates || candidates.length === 0 ? (
              <div className="text-center py-8 text-secondary text-sm text-secondary/60">
                No environment differences detected.
              </div>
            ) : (
              <ul className="space-y-3">
                {candidates.map((c: any, i: number) => (
                  <li key={i} className="border border-border/60 rounded-lg p-3.5 bg-[#08090A]">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="font-mono text-sm text-primary font-bold">{c.name}</span>
                      <span className="text-xs text-secondary bg-elevated border border-border/50 px-2 py-0.5 rounded uppercase tracking-wider">{c.type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-secondary uppercase tracking-wider font-bold block mb-0.5">Warm</span>
                        <span className="font-mono text-primary/70 break-all">{String(c.warmValue)}</span>
                      </div>
                      <div>
                        <span className="text-secondary uppercase tracking-wider font-bold block mb-0.5">Clean</span>
                        <span className="font-mono text-primary/70 break-all">{String(c.cleanValue)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 3. Perturbation & Proof */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-border bg-elevated/30">
          <h3 className="font-semibold text-primary text-sm tracking-wide">3 · Perturbation &amp; Causal Proof</h3>
        </div>
        <div className="p-5 md:p-6">
          {(() => {
            if (!isBehaviorChanged) {
              return (
                <div className="text-center py-8 text-secondary/60 text-sm">
                  <p className="font-semibold text-primary mb-1">No behavioral divergence.</p>
                  Perturbation not required.
                </div>
              );
            }

            const testedCandidates = (candidates || []).filter((c: any) => !!c.perturbationResult).map((c: any) => c.perturbationResult);
            if (testedCandidates.length === 0 && perturbation) {
              testedCandidates.push(perturbation);
            }

            if (testedCandidates.length === 0) {
              return (
                <div className="text-center py-8">
                  <h4 className="text-base font-bold text-primary mb-1.5">No Environment Cause Found</h4>
                  <p className="text-secondary text-sm max-w-md mx-auto leading-relaxed">
                    ColdProof detected a behavioral divergence but could not identify a supported environment candidate to perturb and prove causality.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-12">
                {testedCandidates.map((pert: any, index: number) => {
                  const candidateName = pert.candidate?.name ?? 'Candidate';
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                      {index > 0 && (
                        <div className="absolute -top-6 left-0 right-0 border-t border-border/50" />
                      )}

                      {/* Perturbed execution panel */}
                      <div>
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">
                          {testedCandidates.length > 1 ? `Tested Candidate ${index + 1}` : 'Perturbed Execution'}
                        </p>
                        <TerminalPanel
                          label={`Block · ${candidateName}`}
                          exitCode={pert.perturbedWarm?.exitCode}
                          output={pert.perturbedWarm?.stderr || pert.perturbedWarm?.stdout || ''}
                          highlight={pert.perturbedWarm?.exitCode === 0 ? 'pass' : 'fail'}
                        />
                      </div>

                      {/* Evidence checklist */}
                      <div>
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Failure Signature Match</p>
                        <ul>
                          <CheckRow
                            ok={!!pert.evidence?.candidateObserved}
                            label="Candidate Observed"
                            detail="The candidate was accessed during warm execution."
                          />
                          <CheckRow
                            ok={!!pert.evidence?.candidatePerturbed}
                            label="Candidate Perturbed"
                            detail="ColdProof successfully blocked or altered the candidate."
                          />
                          <CheckRow
                            ok={!!pert.evidence?.perturbedFailed}
                            label="Perturbed Execution Failed"
                            detail="Blocking the candidate caused a failure in the warm environment."
                          />
                          <CheckRow
                            ok={!!pert.evidence?.sameExitCode}
                            label="Exit Code Match"
                            detail="The perturbed failure exit code matches the clean failure exit code."
                          />
                          <CheckRow
                            ok={!!pert.evidence?.failureOutputComparable}
                            label="Textual Signature Match"
                            detail="The failure logs (stderr) are comparable between environments."
                          />
                        </ul>

                        <EvidenceBlock
                          evidence={pert.evidence}
                          candidateName={candidateName}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 4. Plain-English Explanation (Groq) */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-elevated/30 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary text-sm tracking-wide">Plain-English Explanation</h3>
            <p className="text-xs text-secondary mt-0.5">Generated from the recorded evidence</p>
          </div>
          {!aiExplanation && !explanationError && (
            <button
              onClick={handleRequestExplanation}
              disabled={requestingExplanation}
              className="text-xs font-medium text-experiment hover:text-experiment/80 border border-experiment/30 hover:border-experiment/60 px-3 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {requestingExplanation ? (
                <>
                  <span className="w-3 h-3 border border-experiment/30 border-t-experiment rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          )}
        </div>
        <div className="p-5">
          {aiExplanation ? (
            <p className="text-sm text-primary/85 leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
          ) : explanationError ? (
            <p className="text-sm text-secondary italic">{explanationError}</p>
          ) : (
            <p className="text-sm text-secondary/60 italic">
              Click &ldquo;Generate&rdquo; to produce a plain-English explanation of the investigation evidence.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
