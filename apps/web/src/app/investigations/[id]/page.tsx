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
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ─── Evidence config ───────────────────────────────────────────────
const EVIDENCE_CONFIG: Record<string, {
  badge: string; card: string; icon: 'check' | 'warn' | 'info'; label: string; accentBorder: string;
}> = {
  CONFIRMED:       { badge: 'bg-pass/10 border-pass/40 text-pass',             card: 'bg-pass/5 border-pass/30',         icon: 'check', label: 'Confirmed',       accentBorder: 'border-l-pass' },
  STRONG_EVIDENCE: { badge: 'bg-evidence/10 border-evidence/40 text-evidence', card: 'bg-evidence/5 border-evidence/30', icon: 'warn',  label: 'Strong Evidence',  accentBorder: 'border-l-evidence' },
  PARTIAL_EVIDENCE:{ badge: 'bg-evidence/10 border-evidence/30 text-evidence', card: 'bg-evidence/5 border-evidence/20', icon: 'warn',  label: 'Partial Evidence', accentBorder: 'border-l-evidence/60' },
  NOT_IMPLICATED:  { badge: 'bg-secondary/8 border-secondary/20 text-secondary', card: 'bg-surface border-border',       icon: 'info',  label: 'Not Implicated',   accentBorder: 'border-l-border' },
  UNABLE_TO_TEST:  { badge: 'bg-secondary/8 border-secondary/20 text-secondary', card: 'bg-surface border-border',       icon: 'info',  label: 'Unable to Test',   accentBorder: 'border-l-border' },
};

// ─── Pipeline visualization ────────────────────────────────────────
interface PipelineStageConfig {
  key: string;
  label: string;
  sublabel: string;
  active: boolean;
  color?: 'pass' | 'evidence' | 'fail' | 'experiment';
}

function InvestigationPipeline({ stages }: { stages: PipelineStageConfig[] }) {
  const colorMap = {
    pass:       { ring: 'bg-pass border-pass/60', text: 'text-pass', line: 'bg-pass/40', glow: 'pipeline-node-pass' },
    evidence:   { ring: 'bg-evidence border-evidence/60', text: 'text-evidence', line: 'bg-evidence/40', glow: 'pipeline-node-evidence' },
    fail:       { ring: 'bg-fail border-fail/60', text: 'text-fail', line: 'bg-fail/30', glow: '' },
    experiment: { ring: 'bg-experiment border-experiment/60', text: 'text-experiment', line: 'bg-experiment/40', glow: 'pipeline-node-active' },
  };
  const inactiveRing = 'bg-elevated border-border/50';

  return (
    <div className="flex items-center gap-0 mt-5 mb-1">
      {stages.map((stage, i) => {
        const c = stage.active && stage.color ? colorMap[stage.color] : null;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center min-w-0">
              {/* Node */}
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                stage.active && c ? `${c.ring} ${c.glow}` : inactiveRing
              )}>
                {stage.active ? (
                  <svg className={cn('w-3.5 h-3.5', c ? c.text : 'text-secondary/40')} fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-border/60" />
                )}
              </div>
              {/* Label */}
              <p className={cn(
                'text-[9px] font-bold uppercase tracking-[0.14em] mt-1.5 text-center whitespace-nowrap',
                stage.active && c ? c.text : 'text-secondary/35'
              )}>
                {stage.label}
              </p>
              <p className={cn(
                'text-[9px] font-mono text-center mt-0.5 whitespace-nowrap',
                stage.active ? 'text-secondary/50' : 'text-secondary/20'
              )}>
                {stage.sublabel}
              </p>
            </div>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className={cn(
                'flex-1 h-[2px] mx-1 rounded-full min-w-[16px] max-w-[40px] transition-all duration-500',
                stage.active && c ? c.line : 'bg-border/30'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Exit badge ────────────────────────────────────────────────────
function ExitBadge({ code }: { code: number | null | undefined }) {
  const pass = code === 0;
  return (
    <span className={cn(
      'text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono',
      pass
        ? 'bg-pass/10 border-pass/30 text-pass'
        : 'bg-fail/10 border-fail/30 text-fail'
    )}>
      {pass ? '✓' : '✗'} exit {code ?? '?'}
    </span>
  );
}

// ─── Terminal panel ────────────────────────────────────────────────
function TerminalPanel({
  label, exitCode, output, highlight,
}: {
  label: string;
  exitCode: number | null | undefined;
  output: string;
  highlight?: 'pass' | 'fail';
}) {
  const headerBg =
    highlight === 'pass' ? 'bg-pass/8 border-pass/20' :
    highlight === 'fail' ? 'bg-fail/8 border-fail/20' :
    'bg-elevated/40 border-border/40';
  const borderCls =
    highlight === 'pass' ? 'border-pass/20' :
    highlight === 'fail' ? 'border-fail/20' :
    'border-border/40';

  return (
    <div className={cn('border rounded-lg overflow-hidden flex flex-col bg-[#070809]', borderCls)}>
      <div className={cn(
        'px-4 py-2 border-b flex justify-between items-center gap-2',
        headerBg
      )}>
        <div className="flex items-center gap-2">
          {/* Traffic light dots */}
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', highlight === 'pass' ? 'bg-pass/60' : 'bg-border/60')} />
            <span className={cn('w-2 h-2 rounded-full', highlight === 'fail' ? 'bg-fail/60' : 'bg-border/60')} />
          </div>
          <span className="text-[10px] font-bold text-secondary/60 uppercase tracking-[0.14em]">{label}</span>
        </div>
        <ExitBadge code={exitCode} />
      </div>
      <pre className="p-4 text-[11px] font-mono text-primary/70 overflow-auto max-h-56 whitespace-pre-wrap leading-[1.7] flex-grow">
        {output || <span className="text-secondary/30 italic">No output captured</span>}
      </pre>
    </div>
  );
}

// ─── Check row ─────────────────────────────────────────────────────
function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-3 border-b border-border/20 last:border-0">
      <div className={cn(
        'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
        ok
          ? 'bg-pass/15 text-pass border border-pass/30'
          : 'bg-elevated text-secondary/30 border border-border/40'
      )}>
        {ok ? '✓' : '·'}
      </div>
      <div>
        <p className={cn('text-sm font-semibold', ok ? 'text-primary' : 'text-secondary/50')}>{label}</p>
        <p className="text-xs text-secondary/50 mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </li>
  );
}

// ─── Evidence card ──────────────────────────────────────────────────
function EvidenceCard({ evidence, candidateName }: { evidence: any; candidateName?: string }) {
  const cls = evidence?.classification;
  const cfg = EVIDENCE_CONFIG[cls] ?? {
    badge: 'bg-secondary/8 border-secondary/20 text-secondary',
    card: 'bg-surface border-border',
    icon: 'info' as const,
    label: cls ?? 'Unknown',
    accentBorder: 'border-l-border',
  };
  const isPositive = cls === 'CONFIRMED' || cls === 'STRONG_EVIDENCE' || cls === 'PARTIAL_EVIDENCE';
  const name = candidateName ?? 'this candidate';

  const headline =
    cls === 'CONFIRMED'        ? `${name} is the environment cause.` :
    cls === 'STRONG_EVIDENCE'  ? `${name} strongly contributed to the failure.` :
    cls === 'PARTIAL_EVIDENCE' ? `${name} contributed, but wasn't the only cause.` :
    cls === 'NOT_IMPLICATED'   ? `${name} was not the cause.` :
    `Evidence was inconclusive for ${name}.`;

  const description =
    cls === 'CONFIRMED'        ? `Blocking ${name} in the warm environment reproduced the exact clean failure. Exit code and failure signatures matched. This is causal proof.` :
    cls === 'STRONG_EVIDENCE'  ? `Blocking ${name} caused a failure with the same exit code boundary as the clean environment failure. Strong experimental evidence.` :
    cls === 'PARTIAL_EVIDENCE' ? `Restoring ${name} allowed execution to progress further, but another failure occurred. ${name} is a partial contributor — not the complete cause.` :
    cls === 'NOT_IMPLICATED'   ? `Blocking ${name} did not reproduce the clean failure signature. The evidence does not support ${name} as the cause.` :
    `ColdProof was unable to perform a conclusive perturbation experiment for this candidate.`;

  return (
    <div className={cn(
      'rounded-xl border border-l-[3px] p-5 flex items-start gap-4 mt-5 transition-all duration-200',
      cfg.card,
      cfg.accentBorder
    )}>
      <div className={cn(
        'w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5',
        cls === 'CONFIRMED'  ? 'bg-pass/15 border-pass/40 text-pass' :
        isPositive           ? 'bg-evidence/15 border-evidence/40 text-evidence' :
        'bg-elevated border-border text-secondary/40'
      )}>
        {cfg.icon === 'check' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
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
        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
          <span className={cn('text-xs font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border', cfg.badge)}>
            {cfg.label}
          </span>
        </div>
        <p className="text-sm font-semibold text-primary mb-1">{headline}</p>
        <p className="text-sm text-primary/70 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Delete modal ───────────────────────────────────────────────────
function DeleteModal({
  open, onCancel, onDeleted, getToken, id
}: {
  open: boolean; onCancel: () => void; onDeleted: () => void;
  getToken: () => Promise<string | null>; id: string;
}) {
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
function Section({ step, title, badge, accentColor = 'experiment', children }: {
  step: string; title: string; badge?: React.ReactNode;
  accentColor?: 'experiment' | 'pass' | 'fail' | 'evidence'; children: React.ReactNode;
}) {
  const ref = useReveal();
  const accentCls = {
    experiment: 'border-l-[2px] border-l-experiment/50',
    pass:       'border-l-[2px] border-l-pass/50',
    fail:       'border-l-[2px] border-l-fail/40',
    evidence:   'border-l-[2px] border-l-evidence/50',
  }[accentColor];

  return (
    <div ref={ref} className={cn(
      'reveal bg-surface border border-border rounded-xl overflow-hidden mb-4',
      accentCls
    )}>
      <div className="px-5 py-3.5 border-b border-border/60 bg-elevated/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-secondary/40 select-none tracking-widest">{step}</span>
          <h3 className="font-semibold text-primary text-sm tracking-wide">{title}</h3>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Candidate type icon ───────────────────────────────────────────
function CandidateTypeIcon({ type }: { type: string }) {
  if (type === 'EXECUTABLE' || type === 'PROJECT_LOCAL_EXECUTABLE') {
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === 'RUNTIME_VERSION') {
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}

// ─── Candidate row ─────────────────────────────────────────────────
function CandidateRow({ candidate }: { candidate: any }) {
  const hasPert = !!candidate.perturbationResult;
  const pertEvidence = candidate.perturbationResult?.evidence?.classification;
  const cfg = pertEvidence ? EVIDENCE_CONFIG[pertEvidence] : undefined;
  const typeLabel = (candidate.type ?? '').replace(/_/g, ' ');

  return (
    <div className="border border-border/40 rounded-lg p-3.5 bg-[#08090A] hover:border-border/70 transition-colors duration-150 group">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-secondary/40 group-hover:text-secondary/60 transition-colors">
            <CandidateTypeIcon type={candidate.type ?? ''} />
          </span>
          <span className="font-mono text-sm text-primary font-bold">{candidate.name}</span>
          {hasPert && cfg && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.badge)}>
              {cfg.label}
            </span>
          )}
        </div>
        <span className="text-[9px] text-secondary/50 bg-elevated border border-border/30 px-2 py-0.5 rounded uppercase tracking-[0.12em] font-mono shrink-0">
          {typeLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-elevated/40 rounded-md px-3 py-2">
          <span className="text-secondary/50 uppercase tracking-[0.1em] font-bold text-[9px] block mb-1">Warm (local)</span>
          <span className="font-mono text-primary/70 break-all">{String(candidate.warmValue)}</span>
        </div>
        <div className="bg-elevated/40 rounded-md px-3 py-2">
          <span className="text-secondary/50 uppercase tracking-[0.1em] font-bold text-[9px] block mb-1">Clean (Docker)</span>
          <span className="font-mono text-primary/70 break-all">{String(candidate.cleanValue)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── AI explanation ────────────────────────────────────────────────
function AIExplanation({ text }: { text: string }) {
  // Split on double-newlines into paragraphs. Each paragraph that starts with
  // a recognizable header keyword gets visual emphasis.
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const SECTION_HEADERS = [
    'what happened', 'what was different', 'what coldproof tested', 'what the evidence means',
    'next steps', 'conclusion', 'summary', 'what this proves', 'what differed',
  ];

  return (
    <div className="space-y-4">
      {paragraphs.map((para, i) => {
        const firstLine = para.split('\n')[0].trim().toLowerCase();
        const isHeader = SECTION_HEADERS.some(h => firstLine.startsWith(h) || firstLine.startsWith('###') || firstLine.startsWith('**'));
        const cleanText = para.replace(/^###?\s*/, '').replace(/^\*\*(.+)\*\*/m, '$1');

        if (isHeader) {
          const [headerLine, ...rest] = cleanText.split('\n');
          return (
            <div key={i}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary/50 font-mono mb-1.5">
                {headerLine.replace(/\*\*/g, '').trim()}
              </p>
              {rest.length > 0 && (
                <p className="text-sm text-primary/80 leading-relaxed whitespace-pre-wrap">
                  {rest.join('\n').trim()}
                </p>
              )}
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-primary/80 leading-relaxed whitespace-pre-wrap">
            {cleanText}
          </p>
        );
      })}
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
          <p className="text-secondary/50 text-xs font-mono">Loading investigation…</p>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto w-full animate-slide-up">
        <div className="bg-fail/6 border border-fail/20 p-10 rounded-xl text-center">
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
  const headerLabel = headerEvidenceCfg?.label ?? (behaviorChanged ? 'Divergence Detected' : 'No Divergence');

  // Build tested candidates list
  const testedCandidates: any[] = [];
  if (candidates) {
    for (const c of candidates) {
      if (c.perturbationResult) testedCandidates.push({ ...c.perturbationResult, _name: c.name });
    }
  }
  if (testedCandidates.length === 0 && perturbation) testedCandidates.push(perturbation);

  // Pipeline config
  const pipelineStages: PipelineStageConfig[] = [
    {
      key: 'reproduce',
      label: 'REPRODUCE',
      sublabel: behaviorChanged ? comparison?.classification?.replace('WARM_', 'W·').replace('_CLEAN_', '/C·').replace('FAIL', '✗').replace('PASS', '✓') ?? 'diverged' : 'consistent',
      active: true,
      color: behaviorChanged ? 'fail' : 'pass',
    },
    {
      key: 'perturb',
      label: 'PERTURB',
      sublabel: testedCandidates.length > 0 ? `${testedCandidates.length} candidate${testedCandidates.length > 1 ? 's' : ''}` : 'no test',
      active: behaviorChanged && testedCandidates.length > 0,
      color: 'experiment',
    },
    {
      key: 'prove',
      label: 'PROVE',
      sublabel: evidenceCls ? EVIDENCE_CONFIG[evidenceCls]?.label ?? evidenceCls : 'pending',
      active: !!evidenceCls && evidenceCls !== 'NOT_IMPLICATED',
      color: evidenceCls === 'CONFIRMED' ? 'pass' : evidenceCls === 'STRONG_EVIDENCE' || evidenceCls === 'PARTIAL_EVIDENCE' ? 'evidence' : undefined,
    },
  ];

  return (
    <>
      <div className="px-6 py-8 max-w-5xl mx-auto w-full">

        {/* Back + Delete row */}
        <div className="flex items-center justify-between mb-7 animate-fade-in">
          <Link href="/" className="inline-flex items-center text-secondary/60 hover:text-primary text-sm transition-colors duration-150 gap-1.5 group">
            <svg className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Investigations
          </Link>
          <button
            onClick={() => { deleteIdRef.current = id; setShowDelete(true); }}
            className="flex items-center gap-1.5 text-xs text-secondary/50 hover:text-fail hover:bg-fail/8 border border-transparent hover:border-fail/20 px-2.5 py-1.5 rounded-lg transition-all duration-150"
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
              <p className="text-secondary/50 text-xs font-mono">
                <span title={exactIST}>{exactIST}</span>
                <span className="mx-1.5 text-secondary/25">·</span>
                <span>{relative}</span>
              </p>
            </div>
            <code className="font-mono text-sm bg-[#07080A] border border-border/50 px-4 py-2.5 rounded-lg text-primary/90 self-start shrink-0 max-w-full md:max-w-sm overflow-x-auto whitespace-nowrap">
              <span className="text-secondary/35 select-none">$ </span>{command}
            </code>
          </div>

          {/* Visual pipeline */}
          <InvestigationPipeline stages={pipelineStages} />
        </div>

        {/* ── Step 01: Reproduce ──────────────────────────────────── */}
        <Section
          step="01"
          title="Reproduce"
          accentColor={behaviorChanged ? 'fail' : 'pass'}
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
              <p className="text-xs text-secondary/50 font-mono bg-elevated/30 border border-border/30 rounded px-3 py-2">
                Comparison: <span className="text-experiment/70">{comparison?.classification}</span>
              </p>
            </div>
          )}
        </Section>

        {/* ── Step 02: Candidates ──────────────────────────────────── */}
        {behaviorChanged && (
          <Section
            step="02"
            title="Candidate Detection"
            accentColor="experiment"
            badge={
              <span className="text-xs font-semibold text-secondary bg-elevated border border-border/50 px-2.5 py-1 rounded-full">
                {candidates?.length ?? 0} {(candidates?.length ?? 0) === 1 ? 'candidate' : 'candidates'}
              </span>
            }
          >
            <div className="p-4 overflow-auto max-h-80">
              {!candidates || candidates.length === 0 ? (
                <p className="text-center py-8 text-secondary/40 text-sm">No environment differences detected.</p>
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

        {/* ── Step 03: Perturbation ────────────────────────────────── */}
        {behaviorChanged && (
          <Section step="03" title="Perturbation & Causal Proof" accentColor="evidence">
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
                            <span className="text-[10px] font-mono text-secondary/40 uppercase tracking-widest">
                              Candidate {index + 1} of {testedCandidates.length}
                            </span>
                            <span className="font-mono text-sm text-primary bg-elevated border border-border/50 px-2.5 py-0.5 rounded">
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
                          {/* Experiment */}
                          <div>
                            <p className="text-[10px] font-bold text-secondary/50 uppercase tracking-[0.16em] mb-3 font-mono">
                              Experiment: block <code className="font-mono text-primary/70 bg-elevated px-1.5 rounded">{candidateName}</code>
                            </p>
                            <TerminalPanel
                              label={`Perturbed warm — ${candidateName} blocked`}
                              exitCode={pert.perturbedWarm?.exitCode}
                              output={pert.perturbedWarm?.stderr || pert.perturbedWarm?.stdout || ''}
                              highlight={pert.perturbedWarm?.exitCode === 0 ? 'pass' : 'fail'}
                            />
                            {/* Experiment flow */}
                            <div className="mt-3 flex items-center gap-1.5 text-[9px] font-mono text-secondary/35 tracking-[0.14em] flex-wrap">
                              <span>OBSERVE</span><span className="text-secondary/20">→</span>
                              <span className="text-secondary/50">BLOCK</span><span className="text-secondary/20">→</span>
                              <span className="text-secondary/50">RE-RUN</span><span className="text-secondary/20">→</span>
                              <span className={cn(
                                pert.evidence?.classification === 'CONFIRMED' ? 'text-pass' :
                                pert.evidence?.classification === 'STRONG_EVIDENCE' || pert.evidence?.classification === 'PARTIAL_EVIDENCE' ? 'text-evidence' :
                                'text-secondary/35'
                              )}>COMPARE</span>
                            </div>
                          </div>

                          {/* Failure signature */}
                          <div>
                            <p className="text-[10px] font-bold text-secondary/50 uppercase tracking-[0.16em] mb-3 font-mono">
                              Failure Signature Match
                            </p>
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
                          <div className="mt-8 border-t border-border/30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Step 04: AI Explanation ─────────────────────────────── */}
        <Section
          step="04"
          title="Plain-English Explanation"
          accentColor="experiment"
          badge={
            !aiExplanation && !explanationError ? (
              <button
                onClick={handleExplain}
                disabled={requestingExplanation}
                className="flex items-center gap-1.5 text-xs font-medium text-experiment hover:text-experiment/80 border border-experiment/30 hover:border-experiment/60 px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50"
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
              <AIExplanation text={aiExplanation} />
            ) : explanationError ? (
              <p className="text-sm text-secondary/50 italic">{explanationError}</p>
            ) : (
              <p className="text-sm text-secondary/40 italic">
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
