'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-primary">Investigations</h1>
        <Link 
          href="/investigations/new"
          className="bg-experiment hover:bg-experiment/90 text-background px-4 py-2 rounded font-semibold transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>New Investigation</span>
        </Link>
      </div>
      <p className="text-secondary mb-8">
        Investigate environment-dependent failures and see the evidence behind the cause.
      </p>

      {error ? (
        <div className="bg-fail/20 border border-fail/50 text-fail p-6 rounded-lg mb-8">
          <p className="font-medium">{error}</p>
        </div>
      ) : loadingData ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-experiment/30 border-t-experiment rounded-full animate-spin"></div>
        </div>
      ) : investigations.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center flex flex-col items-center">
          <h3 className="text-lg font-semibold text-primary mb-2">No investigations yet.</h3>
          <p className="text-secondary mb-6">Run your first ColdProof investigation from your project root.</p>
          <Link 
            href="/investigations/new"
            className="text-experiment hover:text-experiment/80 font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>New Investigation</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {investigations.map((inv) => (
            <Link 
              key={inv.id} 
              href={`/investigations/${inv.id}`}
              className="bg-surface border border-border rounded-lg p-6 hover:bg-elevated/50 hover:border-experiment/50 transition-all duration-200 group block relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-experiment/0 via-experiment/0 to-experiment/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="flex justify-between items-start mb-5">
                <code className="font-mono text-base bg-elevated border border-border px-2.5 py-1 rounded text-primary shadow-sm">
                  {inv.command}
                </code>
                {inv.perturbation?.evidence?.classification && (
                  <span className={`text-xs font-bold tracking-wider px-2.5 py-1 rounded border shadow-sm ${
                    inv.perturbation.evidence.classification === 'STRONG_EVIDENCE' || inv.perturbation.evidence.classification === 'CONFIRMED' 
                    ? 'bg-evidence/10 border-evidence/40 text-evidence' 
                    : 'bg-elevated border-border text-secondary'
                  }`}>
                    {inv.perturbation.evidence.classification.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-4">
                  <span className={`font-semibold tracking-wide ${
                    inv.comparison?.classification === 'WARM_PASS_CLEAN_FAIL' || inv.comparison?.classification === 'WARM_FAIL_CLEAN_PASS'
                    ? 'text-experiment'
                    : 'text-secondary'
                  }`}>
                    {inv.comparison?.classification || 'UNKNOWN'}
                  </span>
                  {(inv.perturbation?.candidate?.name || (inv.candidates && inv.candidates.length > 0 && inv.candidates[0].name)) && (
                    <span className="text-primary font-mono bg-elevated px-2 py-0.5 rounded border border-border shadow-sm">
                      {inv.perturbation?.candidate?.name || inv.candidates[0].name}
                    </span>
                  )}
                </div>
                <span className="text-secondary text-xs font-medium group-hover:text-primary/70 transition-colors">
                  {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

