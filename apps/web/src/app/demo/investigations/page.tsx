'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }

// ─── Evidence config ─────────────────────────────────────────────────────────
const EVIDENCE_MAP: Record<string, { cls: string; dot: string; label: string; borderClass: string }> = {
  CONFIRMED:        { cls: 'bg-pass/10 border-pass/40 text-pass',               dot: 'bg-pass',        label: 'Confirmed',       borderClass: 'evidence-border-confirmed' },
  STRONG_EVIDENCE:  { cls: 'bg-evidence/10 border-evidence/40 text-evidence',   dot: 'bg-evidence',    label: 'Strong evidence',  borderClass: 'evidence-border-strong' },
  PARTIAL_EVIDENCE: { cls: 'bg-evidence/10 border-evidence/30 text-evidence',   dot: 'bg-evidence/70', label: 'Partial evidence', borderClass: 'evidence-border-partial' },
  NOT_IMPLICATED:   { cls: 'bg-secondary/8 border-secondary/20 text-secondary', dot: 'bg-secondary/50',label: 'Not implicated',   borderClass: 'evidence-border-neutral' },
  NO_ENVIRONMENT_CAUSE_FOUND: { cls: 'bg-secondary/8 border-secondary/20 text-secondary', dot: 'bg-secondary/40',label: 'No environment cause found', borderClass: 'evidence-border-neutral' },
};

function EvidenceBadge({ classification }: { classification?: string }) {
  if (!classification) return null;
  const e = EVIDENCE_MAP[classification] ?? { cls: 'bg-secondary/8 border-secondary/20 text-secondary', dot: 'bg-secondary/40', label: classification, borderClass: 'evidence-border-neutral' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full border', e.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', e.dot)} />
      {e.label}
    </span>
  );
}

function ClassificationBadge({ classification }: { classification?: string }) {
  if (!classification) return null;
  const diverged = classification === 'WARM_PASS_CLEAN_FAIL' || classification === 'WARM_FAIL_CLEAN_PASS';
  const label = {
    WARM_PASS_CLEAN_FAIL: 'WARM ✓ / CLEAN ✗',
    WARM_FAIL_CLEAN_PASS: 'WARM ✗ / CLEAN ✓',
    BOTH_FAIL: 'BOTH ✗',
    BOTH_PASS: 'BOTH ✓',
  }[classification] ?? classification.replace(/_/g, ' ');
  return (
    <span className={cn('text-xs font-mono tracking-wide px-2 py-0.5 rounded border',
      diverged ? 'bg-fail/8 border-fail/20 text-fail/80' : 'bg-secondary/8 border-secondary/20 text-secondary/70'
    )}>{label}</span>
  );
}

function Timestamp({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt);
  const ist = toZonedTime(date, 'Asia/Kolkata');
  const full = format(ist, 'd MMM yyyy · h:mm a') + ' IST';
  const rel = formatDistanceToNow(date, { addSuffix: true });
  return <span className="text-secondary/50 text-xs font-mono tabular-nums" title={full}>{rel}</span>;
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-lg px-5 py-4 overflow-hidden relative">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="h-7 w-52 rounded skeleton-shimmer" />
        <div className="h-6 w-28 rounded-full skeleton-shimmer" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2"><div className="h-5 w-32 rounded skeleton-shimmer" /><div className="h-5 w-16 rounded skeleton-shimmer" /></div>
        <div className="h-4 w-20 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}



function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-elevated border border-border/80 text-primary text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5">
        <svg className="w-4 h-4 text-pass flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  );
}

function LogoMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 1.5" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface border border-border rounded-xl p-14 text-center animate-slide-up">
      <div className="w-14 h-14 mx-auto mb-5 rounded-full border border-border/60 bg-elevated/50 flex items-center justify-center">
        <LogoMark size={22} className="text-secondary/40" />
      </div>
      <h3 className="text-base font-semibold text-primary mb-2">No investigations yet</h3>
      <p className="text-secondary/70 text-xs font-mono uppercase tracking-widest mb-1">Reproduce · Perturb · Prove</p>
      <p className="text-secondary text-sm mb-6 max-w-xs mx-auto leading-relaxed mt-3">
        Run your first investigation to see experimental evidence here.
      </p>
      <Link href="/" className="hidden">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Start a new investigation
      </Link>
    </div>
  );
}

function InvestigationCard({ inv }: { inv: any }) {
  const evidenceCls = inv.perturbation?.evidence?.classification;
  const candidateName = inv.perturbation?.candidate?.name || inv.candidates?.[0]?.name;
  const borderAccent =
    evidenceCls === 'CONFIRMED'        ? 'evidence-border-confirmed' :
    evidenceCls === 'STRONG_EVIDENCE'  ? 'evidence-border-strong' :
    evidenceCls === 'PARTIAL_EVIDENCE' ? 'evidence-border-partial' :
                                         'evidence-border-neutral';
  const warmExit  = inv.comparison?.warm?.exitCode;
  const cleanExit = inv.comparison?.clean?.exitCode;

  return (
    <div className={cn(
      'group relative bg-surface border border-border rounded-lg overflow-hidden',
      'hover:border-border/80 hover:bg-elevated/20 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)] transition-all duration-200 animate-slide-up',
      borderAccent
    )}>
      <Link href={`/demo/investigations/${inv.id}`} className="block px-5 py-4 pr-14">
        {/* Project Name row */}
        <div className="mb-2 text-xs font-semibold text-secondary/80 flex items-center gap-1.5 uppercase tracking-wider">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {inv.projectName || 'Project name unavailable'}
        </div>

        {/* Command row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <code className="font-mono text-sm bg-[#08090A] border border-border/50 px-3 py-1.5 rounded-md text-primary/90 max-w-[60%] truncate flex items-center gap-1.5">
            <span className="text-secondary/40 select-none text-xs">$</span>
            {inv.command}
          </code>
          <EvidenceBadge classification={evidenceCls} />
        </div>

        {/* Execution status row */}
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          {warmExit !== undefined && warmExit !== null && (
            <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded border',
              warmExit === 0 ? 'bg-pass/8 border-pass/25 text-pass' : 'bg-fail/8 border-fail/25 text-fail'
            )}>
              {warmExit === 0 ? '✓' : '✗'} WARM
            </span>
          )}
          {cleanExit !== undefined && cleanExit !== null && (
            <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded border',
              cleanExit === 0 ? 'bg-pass/8 border-pass/25 text-pass' : 'bg-fail/8 border-fail/25 text-fail'
            )}>
              {cleanExit === 0 ? '✓' : '✗'} CLEAN
            </span>
          )}
          {candidateName && (
            <span className="font-mono text-primary/70 bg-elevated border border-border/40 px-2 py-0.5 rounded text-xs">
              {candidateName}
            </span>
          )}
          <ClassificationBadge classification={inv.comparison?.classification} />
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between text-xs gap-3">
          <Timestamp createdAt={inv.createdAt} />
          <span className="opacity-0 group-hover:opacity-100 text-secondary/40 transition-opacity duration-200 select-none" aria-hidden="true">→</span>
        </div>
      </Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InvestigationsPage() {
  
  const router = useRouter();
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  

  useEffect(() => {
    async function fetchData() {
      try {
        
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/demo/investigations`,
          {}
        );
        if (res.ok) setInvestigations(await res.json());
        else setError('Failed to fetch investigations.');
      } catch { setError('Network error while connecting to the API.'); }
      finally { setLoadingData(false); }
    }
    fetchData();
  }, []);

  

  

  if (loadingData && investigations.length === 0) return null;

  return (
    <>
      <div className="px-6 py-8 max-w-4xl mx-auto w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-slide-up">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[10px] font-mono text-secondary/40 uppercase tracking-[0.16em]">Archive</span>
              {!loadingData && investigations.length > 0 && (
                <span className="text-[10px] font-mono text-experiment/60 bg-experiment/8 border border-experiment/20 px-2 py-0.5 rounded-full">
                  {investigations.length} {investigations.length === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-primary tracking-tight">Demo Investigations</h1><span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-experiment/10 text-experiment border border-experiment/20 rounded-full">Read Only</span></div>
            <p className="text-secondary/60 text-sm mt-1 leading-relaxed">
              Evidence records from ColdProof&apos;s causal experiments.
            </p>
          </div>
          <Link
            href="/" className="hidden"
          >
            <svg className="w-3.5 h-3.5 transition-transform duration-150 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New
          </Link>
        </div>

        {/* Content */}
        <div>
          {error ? (
            <div className="bg-fail/8 border border-fail/25 text-fail p-5 rounded-lg text-sm font-medium flex items-start gap-3 animate-slide-up">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold mb-0.5">Could not load investigations</p>
                <p className="text-fail/80 font-normal">{error}</p>
              </div>
            </div>
          ) : loadingData ? (
            <div className="grid gap-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : investigations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-2.5 stagger-children">
              {investigations.map((inv) => (
                <InvestigationCard key={inv.id} inv={inv} />
              ))}
            </div>
          )}
        </div>
      </div>

    </>
  );
}
