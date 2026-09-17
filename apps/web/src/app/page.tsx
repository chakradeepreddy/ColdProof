'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }

// ─── Evidence badge ────────────────────────────────────────────────
const EVIDENCE_MAP: Record<string, { cls: string; dot: string; label: string }> = {
  CONFIRMED:         { cls: 'bg-pass/10 border-pass/40 text-pass',             dot: 'bg-pass',       label: 'Confirmed' },
  STRONG_EVIDENCE:   { cls: 'bg-evidence/10 border-evidence/40 text-evidence', dot: 'bg-evidence',   label: 'Strong evidence' },
  PARTIAL_EVIDENCE:  { cls: 'bg-evidence/10 border-evidence/30 text-evidence', dot: 'bg-evidence/70',label: 'Partial evidence' },
  NOT_IMPLICATED:    { cls: 'bg-secondary/8 border-secondary/20 text-secondary', dot: 'bg-secondary/50', label: 'Not implicated' },
  UNABLE_TO_TEST:    { cls: 'bg-secondary/8 border-secondary/20 text-secondary', dot: 'bg-secondary/40', label: 'Unable to test' },
};

function EvidenceBadge({ classification }: { classification?: string }) {
  if (!classification) return null;
  const e = EVIDENCE_MAP[classification] ?? { cls: 'bg-secondary/8 border-secondary/20 text-secondary', dot: 'bg-secondary/40', label: classification };
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
  const label = classification.replace(/_/g, ' ');
  return (
    <span className={cn(
      'text-xs font-mono tracking-wide px-2 py-0.5 rounded border',
      diverged
        ? 'bg-fail/8 border-fail/20 text-fail/80'
        : 'bg-secondary/8 border-secondary/20 text-secondary/70'
    )}>
      {label}
    </span>
  );
}

function Timestamp({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt);
  const ist = toZonedTime(date, 'Asia/Kolkata');
  const full = format(ist, 'd MMM yyyy · h:mm a') + ' IST';
  const rel = formatDistanceToNow(date, { addSuffix: true });
  return <span className="text-secondary/60 text-xs font-medium" title={full}>{rel}</span>;
}

// ─── Skeleton card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-lg px-5 py-4 animate-pulse">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="h-7 w-48 bg-elevated rounded" />
        <div className="h-6 w-28 bg-elevated rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-32 bg-elevated rounded" />
          <div className="h-5 w-16 bg-elevated rounded" />
        </div>
        <div className="h-4 w-20 bg-elevated rounded" />
      </div>
    </div>
  );
}

// ─── Delete confirmation modal ──────────────────────────────────────
function DeleteModal({
  open,
  investigationId,
  onCancel,
  onDeleted,
  getToken,
}: {
  open: boolean;
  investigationId: string;
  onCancel: () => void;
  onDeleted: (id: string) => void;
  getToken: () => Promise<string | null>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setError('');
      setDeleting(false);
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations/${investigationId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        onDeleted(investigationId);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Delete failed. Please try again.');
        setDeleting(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      {/* Panel */}
      <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-fail/10 border border-fail/25 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-fail" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <h2 id="delete-modal-title" className="text-base font-bold text-primary mb-1.5">
          Delete investigation?
        </h2>
        <p className="text-sm text-secondary leading-relaxed mb-5">
          This will permanently remove this investigation and all its stored results. This action cannot be undone.
        </p>

        {error && (
          <p className="text-xs text-fail bg-fail/8 border border-fail/20 rounded p-2.5 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-secondary hover:text-primary hover:border-border/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg bg-fail/90 hover:bg-fail text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting…
              </>
            ) : 'Delete Investigation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
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

// ─── Main page ──────────────────────────────────────────────────────
export default function InvestigationsPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) setInvestigations(await res.json());
        else setError('Failed to fetch investigations.');
      } catch {
        setError('Network error while connecting to the API.');
      } finally {
        setLoadingData(false);
      }
    }
    if (user && !loading) fetchData();
  }, [user, loading, getToken]);

  const handleDeleted = useCallback((id: string) => {
    setDeleteTarget(null);
    setInvestigations(prev => prev.filter(i => i.id !== id));
    setToast('Investigation deleted.');
  }, []);

  const wrappedGetToken = useCallback(async () => {
    return await getToken();
  }, [getToken]);

  if (loading || !user) return null;

  return (
    <>
      <div className="px-6 py-8 max-w-4xl mx-auto w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Investigations</h1>
            <p className="text-secondary text-sm mt-1 leading-relaxed">
              Controlled perturbation experiments for environment-dependent failures.
            </p>
          </div>
          <Link
            href="/investigations/new"
            className="flex items-center gap-2 bg-experiment hover:bg-experiment/90 text-[#0B0D0F] px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 shadow-sm hover:shadow-experiment/20 hover:shadow-md active:scale-[0.97] shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold mb-0.5">Could not load investigations</p>
                <p className="text-fail/80 font-normal">{error}</p>
              </div>
            </div>
          ) : loadingData ? (
            <div className="grid gap-3">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : investigations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-2.5 stagger-children">
              {investigations.map((inv) => (
                <InvestigationCard
                  key={inv.id}
                  inv={inv}
                  onDeleteClick={() => setDeleteTarget(inv.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      <DeleteModal
        open={!!deleteTarget}
        investigationId={deleteTarget ?? ''}
        onCancel={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
        getToken={wrappedGetToken}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}

// ─── Investigation card ─────────────────────────────────────────────
function InvestigationCard({ inv, onDeleteClick }: { inv: any; onDeleteClick: () => void }) {
  const evidenceCls = inv.perturbation?.evidence?.classification;
  const candidateName = inv.perturbation?.candidate?.name || inv.candidates?.[0]?.name;

  return (
    <div className="group relative bg-surface border border-border rounded-lg hover:border-experiment/30 hover:bg-elevated/30 transition-all duration-200 animate-slide-up">
      {/* Clickable area */}
      <Link
        href={`/investigations/${inv.id}`}
        className="block px-5 py-4 pr-14"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <code className="font-mono text-sm bg-[#08090A] border border-border/60 px-2.5 py-1 rounded text-primary max-w-[60%] truncate">
            <span className="text-secondary/50 select-none">$ </span>{inv.command}
          </code>
          <EvidenceBadge classification={evidenceCls} />
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ClassificationBadge classification={inv.comparison?.classification} />
            {candidateName && (
              <span className="font-mono text-primary/80 bg-elevated border border-border/50 px-2 py-0.5 rounded text-xs">
                {candidateName}
              </span>
            )}
          </div>
          <Timestamp createdAt={inv.createdAt} />
        </div>
      </Link>

      {/* Delete button — appears on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
        aria-label="Delete investigation"
        className="absolute top-3 right-3 p-1.5 rounded-md text-secondary/0 group-hover:text-secondary/40 hover:!text-fail hover:bg-fail/10 transition-all duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-surface border border-border rounded-xl p-14 text-center animate-slide-up">
      <div className="w-12 h-12 mx-auto mb-5 rounded-full border border-border bg-elevated flex items-center justify-center">
        <svg className="w-5 h-5 text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-primary mb-1.5">No investigations yet</h3>
      <p className="text-secondary text-sm mb-6 max-w-xs mx-auto leading-relaxed">
        Run your first ColdProof investigation to see experimental evidence here.
      </p>
      <Link
        href="/investigations/new"
        className="inline-flex items-center gap-2 text-sm bg-experiment/10 hover:bg-experiment/15 border border-experiment/30 hover:border-experiment/50 text-experiment px-4 py-2 rounded-lg font-medium transition-all duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Start a new investigation
      </Link>
    </div>
  );
}
