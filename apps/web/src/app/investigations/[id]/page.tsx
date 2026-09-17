'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }

// ─── Scroll-reveal hook ────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('revealed'); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ─── Sub-components ────────────────────────────────────────────────

function ExitBadge({ code }: { code: number | null | undefined }) {
  const pass = code === 0;
  return (
    <span className={cn(
      'text-xs font-bold px-2.5 py-0.5 rounded-full border font-mono',
      pass
        ? 'bg-pass/10 border-pass/30 text-pass'
        : 'bg-fail/10 border-fail/30 text-fail'
    )}>
      {pass ? 'PASS' : 'FAIL'} · exit {code ?? '?'}
    </span>
  );
}

function TerminalPanel({
  label, exitCode, output, highlight,
}: { label: string; exitCode: number | null | undefined; output: string; highlight?: 'pass' | 'fail' }) {
  const borderCls =
    highlight === 'pass' ? 'border-pass/20' :
    highlight === 'fail' ? 'border-fail/20' :
    'border-border/50';
  const headerCls =
    highlight === 'pass' ? 'bg-pass/5' :
    highlight === 'fail' ? 'bg-fail/5' :
    'bg-surface/20';
  return (
    <div className={cn('border rounded-lg overflow-hidden flex flex-col bg-[#08090A]', borderCls)}>
      <div className={cn('px-4 py-2.5 border-b border-border/40 text-xs font-bold text-secondary uppercase tracking-widest flex justify-between items-center', headerCls)}>
        <span>{label}</span>
        <ExitBadge code={exitCode} />
      </div>
      <pre className="p-4 text-xs font-mono text-primary/75 overflow-auto max-h-52 whitespace-pre-wrap leading-relaxed flex-grow">
        {output || <span className="text-secondary/40 italic">No output captured</span>}
      </pre>
    </div>
  );
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-3 border-b border-border/25 last:border-0">
      <div className={cn(
        'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
        ok ? 'bg-pass/15 text-pass border border-pass/30' : 'bg-elevated text-secondary/40 border border-border/50'
      )}>
        {ok ? '✓' : '·'}
      </div>
      <div>
        <p className={cn('text-sm font-semibold', ok ? 'text-primary' : 'text-secondary/60')}>{label}</p>
        <p className="text-xs text-secondary/60 mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </li>
  );
}

const EVIDENCE_CONFIG: Record<string, { badge: string; card: string; icon: 'check' | 'warn' | 'info'; label: string }> = {
  CONFIRMED:       { badge: 'bg-pass/10 border-pass/40 text-pass',         card: 'bg-pass/5 border-pass/30',         icon: 'check', label: 'Confirmed' },
  STRONG_EVIDENCE: { badge: 'bg-evidence/10 border-evidence/40 text-evidence', card: 'bg-evidence/5 border-evidence/30', icon: 'warn', label: 'Strong Evidence' },
  PARTIAL_EVIDENCE:{ badge: 'bg-evidence/10 border-evidence/30 text-evidence', card: 'bg-evidence/5 border-evidence/20', icon: 'warn', label: 'Partial Evidence' },
  NOT_IMPLICATED:  { badge: 'bg-secondary/8 border-secondary/20 text-secondary', card: 'bg-surface border-border',    icon: 'info', label: 'Not Implicated' },
  UNABLE_TO_TEST:  { badge: 'bg-secondary/8 border-secondary/20 text-secondary', card: 'bg-surface border-border',    icon: 'info', label: 'Unable to Test' },
};

function EvidenceCard({ evidence, candidateName }: { evidence: any; candidateName?: string }) {
  const cls = evidence?.classification;
  const cfg = EVIDENCE_CONFIG[cls] ?? { badge: 'bg-secondary/8 border-secondary/20 text-secondary', card: 'bg-surface border-border', icon: 'info' as const, label: cls ?? 'Unknown' };
  const isPositive = cls === 'CONFIRMED' || cls === 'STRONG_EVIDENCE' || cls === 'PARTIAL_EVIDENCE';
  const name = candidateName ?? 'Candidate';

  const description =
    cls === 'CONFIRMED'        ? `${name} confirmed as the causal environmental factor.` :
    cls === 'STRONG_EVIDENCE'  ? `Strong evidence supports ${name} as the environmental contributor. Exit codes and failure signatures matched.` :
    cls === 'PARTIAL_EVIDENCE' ? `Restoring ${name} allowed execution to progress further, but another failure occurred — a partial contributor.` :
    cls === 'NOT_IMPLICATED'   ? `Blocking ${name} did not reproduce the clean failure signature. Not implicated as a cause.` :
    `Evidence was not conclusive for ${name}.`;

  return (
    <div className={cn('rounded-xl border p-5 flex items-start gap-4 mt-5', cfg.card)}>
      <div className={cn(
        'w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0',
        cls === 'CONFIRMED' ? 'bg-pass/15 border-pass/40 text-pass' :
        isPositive ? 'bg-evidence/15 border-evidence/40 text-evidence' :
        'bg-elevated border-border text-secondary/50'
      )}>
        {cfg.icon === 'check' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : cfg.icon === 'warn' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          <span className={cn('text-xs font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border', cfg.badge)}>
            {cfg.label}
          </span>
        </div>
        <p className="text-sm text-primary/85 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Delete modal ───────────────────────────────────────────────────
function DeleteModal({
  open, onCancel, onDeleted, getToken, id
}: { open: boolean; onCancel: () => void; onDeleted: () => void; getToken: () => Promise<string | null>; id: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open) { setError(''); setDeleting(false); setTimeout(() => cancelRef.current?.focus(), 50); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="del-title">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
        <div className="w-10 h-10 rounded-full bg-fail/10 border border-fail/25 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-fail" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h2 id="del-title" className="text-base font-bold text-primary mb-1.5">Delete investigation?</h2>
        <p className="text-sm text-secondary leading-relaxed mb-5">
          This will permanently remove this investigation and all its stored results. This action cannot be undone.
        </p>
        {error && <p className="text-xs text-fail bg-fail/8 border border-fail/20 rounded p-2.5 mb-4">{error}</p>}
        <div className="flex gap-3">
          <button ref={cancelRef} onClick={onCancel} disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-secondary hover:text-primary hover:border-border/70 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={async () => {
            setDeleting(true); setError('');
            try {
              const token = await getToken();
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations/${id || ''}`,
                { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
              );
              if (res.ok) onDeleted();
              else { const b = await res.json().catch(() => ({})); setError(b.error || 'Delete failed.'); setDeleting(false); }
            } catch { setError('Network error.'); setDeleting(false); }
          }} disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg bg-fail/90 hover:bg-fail text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {deleting ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</> : 'Delete Investigation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────
function Section({ step, title, badge, children }: {
  step: string; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal bg-surface border border-border rounded-xl overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-border bg-elevated/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-secondary/50 select-none">{step}</span>
          <h3 className="font-semibold text-primary text-sm tracking-wide">{title}</h3>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Step connector ─────────────────────────────────────────────────
function StepConnector({ active }: { active?: boolean }) {
  return (
    <div className="flex justify-center my-1">
      <div className={cn('w-px h-4', active ? 'bg-experiment/40' : 'bg-border/50')} />
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────
export default function InvestigationDetailPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [investigation, setInvestigation] = useState<any>(null);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [requestingExplanation, setRequestingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState('');
  const deleteIdRef = useRef('');

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return;
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) setInvestigation(await res.json());
        else setError('Investigation not found or you do not have permission.');
      } catch { setError('Failed to fetch investigation.'); }
      finally { setLoadingData(false); }
    }
    if (user && !loading) fetchData();
  }, [user, loading, id, getToken]);

  const handleExplain = async () => {
    if (!investigation) return;
    setRequestingExplanation(true);
    setExplanationError('');
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations/${investigation.id}/explain`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setInvestigation((prev: any) => ({ ...prev, aiExplanation: data.aiExplanation }));
      } else {
        const err = await res.json().catch(() => ({}));
        setExplanationError(err.error || 'AI explanation unavailable.');
      }
    } catch { setExplanationError('AI explanation unavailable.'); }
    finally { setRequestingExplanation(false); }
  };

  const wrappedGetToken = useCallback(async () => await getToken(), [getToken]);

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-experiment/30 border-t-experiment rounded-full animate-spin" />
          <p className="text-secondary/60 text-xs">Loading investigation…</p>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto w-full animate-slide-up">
        <div className="bg-fail/6 border border-fail/20 p-8 rounded-xl text-center">
          <div className="w-10 h-10 rounded-full bg-fail/10 border border-fail/25 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-fail" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-fail mb-1.5">Not Found</h2>
          <p className="text-secondary text-sm mb-5">{error || 'Unknown error.'}</p>
          <Link href="/" className="text-sm text-experiment hover:text-experiment/80 font-medium transition-colors">
            ← Return to Investigations
          </Link>
        </div>
      </div>
    );
  }

  const { command, comparison, candidates, perturbation, createdAt, aiExplanation } = investigation;
  const behaviorChanged = comparison?.behaviorChanged;
  const evidenceCls = perturbation?.evidence?.classification;

  const dateUTC = new Date(createdAt);
  const dateIST = toZonedTime(dateUTC, 'Asia/Kolkata');
  const exactIST = format(dateIST, 'd MMM yyyy · h:mm a') + ' IST';
  const relative = formatDistanceToNow(dateUTC, { addSuffix: true });

  const headerEvidenceCfg = EVIDENCE_CONFIG[evidenceCls ?? ''];
  const headerBadgeCls = headerEvidenceCfg?.badge ??
    (!behaviorChanged ? 'bg-pass/10 text-pass border-pass/30' : 'bg-secondary/10 text-secondary border-secondary/30');
  const headerLabel = headerEvidenceCfg?.label ?? (behaviorChanged ? 'Divergence detected' : 'No divergence');

  // Build list of tested perturbation results
  const testedCandidates: any[] = [];
  if (candidates) {
    for (const c of candidates) {
      if (c.perturbationResult) testedCandidates.push({ ...c.perturbationResult, _name: c.name });
    }
  }
  if (testedCandidates.length === 0 && perturbation) {
    testedCandidates.push(perturbation);
  }

  return (
    <>
      <div className="px-6 py-8 max-w-5xl mx-auto w-full">

        {/* Back + Delete row */}
        <div className="flex items-center justify-between mb-7 animate-fade-in">
          <Link href="/" className="inline-flex items-center text-secondary hover:text-primary text-sm transition-colors gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Investigations
          </Link>
          <button
            onClick={() => { deleteIdRef.current = id; setShowDelete(true); }}
            className="flex items-center gap-1.5 text-xs text-secondary/60 hover:text-fail hover:bg-fail/8 border border-transparent hover:border-fail/20 px-2.5 py-1.5 rounded-lg transition-all duration-150"
            aria-label="Delete investigation"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-primary tracking-tight">Investigation</h1>
                <span className={cn('px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-widest border', headerBadgeCls)}>
                  {headerLabel}
                </span>
              </div>
              <p className="text-secondary/60 text-xs font-medium">
                <span title={exactIST}>{exactIST}</span>
                <span className="mx-1.5 text-secondary/30">·</span>
                <span>{relative}</span>
              </p>
            </div>
            <code className="font-mono text-sm bg-[#08090A] border border-border/60 px-4 py-2.5 rounded-lg text-primary self-start shrink-0 max-w-full md:max-w-sm overflow-x-auto whitespace-nowrap">
              <span className="text-secondary/50 select-none">$ </span>{command}
            </code>
          </div>

          {/* Pipeline indicator */}
          <div className="mt-5 flex items-center gap-2 text-xs font-mono tracking-widest">
            <PipelineStep active={!!behaviorChanged} label="REPRODUCE" />
            <span className="text-secondary/30">→</span>
            <PipelineStep active={testedCandidates.length > 0} label="PERTURB" />
            <span className="text-secondary/30">→</span>
            <PipelineStep
              active={!!evidenceCls && evidenceCls !== 'NOT_IMPLICATED'}
              label="PROVE"
              color={evidenceCls === 'CONFIRMED' ? 'pass' : evidenceCls === 'STRONG_EVIDENCE' || evidenceCls === 'PARTIAL_EVIDENCE' ? 'evidence' : undefined}
            />
          </div>
        </div>

        {/* ── Step 1: Reproduce ──────────────────────────────────── */}
        <Section
          step="01"
          title="Reproduce"
          badge={
            behaviorChanged ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-fail bg-fail/8 border border-fail/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-fail flex-shrink-0" />
                Divergence confirmed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-pass bg-pass/8 border border-pass/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-pass flex-shrink-0" />
                Consistent
              </span>
            )
          }
        >
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TerminalPanel
              label="Warm — local machine"
              exitCode={comparison?.warm?.exitCode}
              output={comparison?.warm?.stderr || comparison?.warm?.stdout || ''}
              highlight={comparison?.warm?.exitCode === 0 ? 'pass' : 'fail'}
            />
            <TerminalPanel
              label="Clean — Docker container"
              exitCode={comparison?.clean?.exitCode}
              output={comparison?.clean?.stderr || comparison?.clean?.stdout || ''}
              highlight={comparison?.clean?.exitCode === 0 ? 'pass' : 'fail'}
            />
          </div>
          {behaviorChanged && (
            <div className="px-4 pb-4">
              <p className="text-xs text-secondary/60 font-mono bg-elevated/40 border border-border/40 rounded px-3 py-2">
                Classification: <span className="text-experiment/80">{comparison?.classification}</span>
              </p>
            </div>
          )}
        </Section>

        {behaviorChanged && <StepConnector active />}

        {/* ── Step 2: Candidates ──────────────────────────────────── */}
        {behaviorChanged && (
          <Section
            step="02"
            title="Candidate Detection"
            badge={
              <span className="text-xs font-semibold text-secondary bg-elevated border border-border/60 px-2.5 py-1 rounded-full">
                {candidates?.length ?? 0} {(candidates?.length ?? 0) === 1 ? 'candidate' : 'candidates'}
              </span>
            }
          >
            <div className="p-4 overflow-auto max-h-72">
              {!candidates || candidates.length === 0 ? (
                <p className="text-center py-8 text-secondary/50 text-sm">No environment differences detected.</p>
              ) : (
                <div className="space-y-2.5">
                  {candidates.map((c: any, i: number) => (
                    <CandidateRow key={i} candidate={c} />
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {behaviorChanged && testedCandidates.length > 0 && <StepConnector active />}

        {/* ── Step 3: Perturbation & Evidence ─────────────────────── */}
        {behaviorChanged && (
          <Section step="03" title="Perturbation &amp; Causal Proof">
            <div className="p-5 md:p-6">
              {testedCandidates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-semibold text-primary mb-1.5">No environment cause found</p>
                  <p className="text-secondary text-sm max-w-md mx-auto leading-relaxed">
                    ColdProof detected a behavioral divergence but could not identify a supported environment candidate to perturb and prove causality.
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  {testedCandidates.map((pert: any, index: number) => {
                    const candidateName = pert.candidate?.name ?? pert._name ?? 'Candidate';
                    const isMulti = testedCandidates.length > 1;
                    return (
                      <div key={index}>
                        {isMulti && (
                          <div className="flex items-center gap-3 mb-5">
                            <span className="text-xs font-mono text-secondary/50 uppercase tracking-widest">
                              Candidate {index + 1} of {testedCandidates.length}
                            </span>
                            <span className="font-mono text-sm text-primary bg-elevated border border-border/60 px-2.5 py-0.5 rounded">
                              {candidateName}
                            </span>
                            {pert.evidence?.classification && (
                              <span className={cn(
                                'text-xs font-semibold tracking-wide px-2 py-0.5 rounded-full border',
                                EVIDENCE_CONFIG[pert.evidence.classification]?.badge ?? 'bg-secondary/8 border-secondary/20 text-secondary'
                              )}>
                                {EVIDENCE_CONFIG[pert.evidence.classification]?.label ?? pert.evidence.classification}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Experiment narrative */}
                          <div>
                            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">
                              Experiment: block <code className="font-mono text-primary/80 bg-elevated px-1.5 rounded">{candidateName}</code>
                            </p>
                            <TerminalPanel
                              label={`Perturbed warm — ${candidateName} blocked`}
                              exitCode={pert.perturbedWarm?.exitCode}
                              output={pert.perturbedWarm?.stderr || pert.perturbedWarm?.stdout || ''}
                              highlight={pert.perturbedWarm?.exitCode === 0 ? 'pass' : 'fail'}
                            />
                            {/* Visual OBSERVE→CHANGE→COMPARE flow */}
                            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-secondary/40 tracking-widest">
                              <span>OBSERVE</span><span>→</span>
                              <span className="text-secondary/60">BLOCK</span><span>→</span>
                              <span className="text-secondary/60">RE-RUN</span><span>→</span>
                              <span className={cn(
                                pert.evidence?.classification === 'CONFIRMED' ? 'text-pass' :
                                pert.evidence?.classification === 'STRONG_EVIDENCE' || pert.evidence?.classification === 'PARTIAL_EVIDENCE' ? 'text-evidence' :
                                'text-secondary/40'
                              )}>COMPARE</span>
                            </div>
                          </div>

                          {/* Failure signature checklist */}
                          <div>
                            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Failure Signature Match</p>
                            <ul>
                              <CheckRow ok={!!pert.evidence?.candidateObserved} label="Candidate Observed" detail="Candidate was accessed during warm execution." />
                              <CheckRow ok={!!pert.evidence?.candidatePerturbed} label="Candidate Perturbed" detail="ColdProof successfully blocked or altered the candidate." />
                              <CheckRow ok={!!pert.evidence?.perturbedFailed} label="Perturbed Execution Failed" detail="Blocking the candidate caused a failure in the warm environment." />
                              <CheckRow ok={!!pert.evidence?.sameExitCode} label="Exit Code Match" detail="Perturbed failure exit code matches the clean failure." />
                              <CheckRow ok={!!pert.evidence?.failureOutputComparable} label="Textual Signature Match" detail="Failure logs are comparable between environments." />
                            </ul>
                            <EvidenceCard evidence={pert.evidence} candidateName={candidateName} />
                          </div>
                        </div>

                        {index < testedCandidates.length - 1 && (
                          <div className="mt-8 border-t border-border/40" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── AI Explanation ─────────────────────────────────────── */}
        <Section
          step="04"
          title="Plain-English Explanation"
          badge={
            !aiExplanation && !explanationError ? (
              <button
                onClick={handleExplain}
                disabled={requestingExplanation}
                className="flex items-center gap-1.5 text-xs font-medium text-experiment hover:text-experiment/80 border border-experiment/30 hover:border-experiment/60 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {requestingExplanation ? (
                  <><span className="w-3 h-3 border border-experiment/30 border-t-experiment rounded-full animate-spin" />Generating…</>
                ) : (
                  <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generate</>
                )}
              </button>
            ) : null
          }
        >
          <div className="p-5">
            {aiExplanation ? (
              <p className="text-sm text-primary/85 leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
            ) : explanationError ? (
              <p className="text-sm text-secondary/60 italic">{explanationError}</p>
            ) : (
              <p className="text-sm text-secondary/50 italic">
                Click &ldquo;Generate&rdquo; for a plain-English explanation of the evidence above. Generated from the recorded data — not from inference.
              </p>
            )}
          </div>
        </Section>
      </div>

      {/* Delete modal */}
      <DeleteModal
        open={showDelete}
        id={id}
        onCancel={() => setShowDelete(false)}
        onDeleted={() => {
          setShowDelete(false);
          setToast('Investigation deleted.');
          setTimeout(() => router.push('/'), 1200);
        }}
        getToken={wrappedGetToken}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-elevated border border-border/80 text-primary text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5">
            <svg className="w-4 h-4 text-pass flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Pipeline step ─────────────────────────────────────────────────
function PipelineStep({ label, active, color }: { label: string; active: boolean; color?: 'pass' | 'evidence' }) {
  return (
    <span className={cn(
      'text-xs font-bold uppercase px-2 py-0.5 rounded',
      !active ? 'text-secondary/30' :
      color === 'pass' ? 'text-pass' :
      color === 'evidence' ? 'text-evidence' :
      'text-experiment'
    )}>
      {label}
    </span>
  );
}

// ─── Candidate row ─────────────────────────────────────────────────
function CandidateRow({ candidate }: { candidate: any }) {
  const hasPert = !!candidate.perturbationResult;
  const pertEvidence = candidate.perturbationResult?.evidence?.classification;
  const cfg = pertEvidence ? EVIDENCE_CONFIG[pertEvidence] : undefined;

  return (
    <div className="border border-border/50 rounded-lg p-3.5 bg-[#08090A] hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between mb-2.5 gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm text-primary font-bold">{candidate.name}</span>
          {hasPert && cfg && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.badge)}>
              {cfg.label}
            </span>
          )}
        </div>
        <span className="text-xs text-secondary/60 bg-elevated border border-border/40 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
          {candidate.type?.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-secondary/60 uppercase tracking-wider font-bold block mb-0.5">Warm</span>
          <span className="font-mono text-primary/65 break-all">{String(candidate.warmValue)}</span>
        </div>
        <div>
          <span className="text-secondary/60 uppercase tracking-wider font-bold block mb-0.5">Clean</span>
          <span className="font-mono text-primary/65 break-all">{String(candidate.cleanValue)}</span>
        </div>
      </div>
    </div>
  );
}
