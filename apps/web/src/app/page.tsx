'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

function EvidenceBadge({ classification }: { classification?: string }) {
  if (!classification) return null;
  const map: Record<string, string> = {
    CONFIRMED: 'bg-pass/10 border-pass/40 text-pass',
    STRONG_EVIDENCE: 'bg-evidence/10 border-evidence/40 text-evidence',
    NOT_IMPLICATED: 'bg-secondary/10 border-secondary/30 text-secondary',
    UNABLE_TO_TEST: 'bg-secondary/10 border-secondary/30 text-secondary',
  };
  const cls = map[classification] ?? 'bg-secondary/10 border-secondary/30 text-secondary';
  return (
    <span className={`text-xs font-bold tracking-wider px-2.5 py-1 rounded border ${cls}`}>
      {classification.replace(/_/g, ' ')}
    </span>
  );
}

function ClassificationBadge({ classification }: { classification?: string }) {
  if (!classification) return null;
  const diverged = classification === 'WARM_PASS_CLEAN_FAIL' || classification === 'WARM_FAIL_CLEAN_PASS';
  return (
    <span className={`text-xs font-semibold tracking-wide ${diverged ? 'text-experiment' : 'text-secondary'}`}>
      {classification}
    </span>
  );
}

function InvestigationTimestamp({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt);
  const ist = toZonedTime(date, 'Asia/Kolkata');
  const formatted = format(ist, 'd MMM yyyy · h:mm a') + ' IST';
  const relative = formatDistanceToNow(date, { addSuffix: true });
  return (
    <span className="text-secondary text-xs font-medium" title={formatted}>
      {relative}
    </span>
  );
}

export default function InvestigationsPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setInvestigations(data);
        } else {
          setError('Failed to fetch investigations.');
        }
      } catch (err) {
        console.error('Failed to fetch investigations:', err);
        setError('Network error while connecting to the API.');
      } finally {
        setLoadingData(false);
      }
    }
    
    if (user && !loading) {
      fetchData();
    }
  }, [user, loading, getToken]);

  if (loading || !user) return null;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Investigations</h1>
          <p className="text-secondary text-sm mt-1">
            Controlled perturbation experiments for environment-dependent failures.
          </p>
        </div>
        <Link
          href="/investigations/new"
          className="flex items-center gap-2 bg-experiment hover:bg-experiment/85 text-[#0B0D0F] px-4 py-2 rounded font-semibold text-sm transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          New
        </Link>
      </div>

      <div className="mt-8">
        {error ? (
          <div className="bg-fail/10 border border-fail/30 text-fail p-5 rounded-lg text-sm font-medium">
            {error}
          </div>
        ) : loadingData ? (
          <div className="flex justify-center p-16">
            <div className="w-7 h-7 border-2 border-experiment/30 border-t-experiment rounded-full animate-spin" />
          </div>
        ) : investigations.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-14 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-border flex items-center justify-center text-secondary">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-primary mb-1">No investigations yet</h3>
            <p className="text-secondary text-sm mb-5">Run your first investigation from your project root.</p>
            <Link
              href="/investigations/new"
              className="inline-flex items-center gap-2 text-sm text-experiment hover:text-experiment/80 font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Start a new investigation
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {investigations.map((inv) => (
              <Link
                key={inv.id}
                href={`/investigations/${inv.id}`}
                className="bg-surface border border-border rounded-lg px-5 py-4 hover:border-experiment/40 hover:bg-elevated/40 transition-all duration-150 group block"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <code className="font-mono text-sm bg-[#08090A] border border-border/60 px-2.5 py-1 rounded text-primary shrink-0 max-w-[60%] truncate">
                    $ {inv.command}
                  </code>
                  <EvidenceBadge classification={inv.perturbation?.evidence?.classification} />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <ClassificationBadge classification={inv.comparison?.classification} />
                    {(inv.perturbation?.candidate?.name || inv.candidates?.[0]?.name) && (
                      <span className="font-mono text-primary bg-elevated border border-border/60 px-2 py-0.5 rounded">
                        {inv.perturbation?.candidate?.name || inv.candidates?.[0]?.name}
                      </span>
                    )}
                  </div>
                  <InvestigationTimestamp createdAt={inv.createdAt} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
