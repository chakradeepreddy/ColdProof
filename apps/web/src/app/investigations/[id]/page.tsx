'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for conditional tailwind classes
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function CausalProofPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [investigation, setInvestigation] = useState<any>(null);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return;
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setInvestigation(data);
        } else {
          setError('Investigation not found or you do not have permission.');
        }
      } catch (err) {
        setError('Failed to fetch investigation proof.');
      } finally {
        setLoadingData(false);
      }
    }
    
    if (user && !loading) {
      fetchData();
    }
  }, [user, loading, id, getToken]);

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-experiment/30 border-t-experiment rounded-full"></div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full flex-grow">
        <div className="bg-fail/10 border border-fail/30 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold text-fail mb-2">Error</h2>
          <p className="text-secondary">{error || 'Unknown error occurred.'}</p>
          <Link href="/" className="inline-block mt-4 text-primary hover:text-experiment underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { command, comparison, candidates, perturbation, createdAt } = investigation;
  const isBehaviorChanged = comparison?.behaviorChanged;

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <Link href="/" className="text-secondary hover:text-primary transition-colors text-sm flex items-center mb-6">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Investigations
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-primary tracking-tight">Causal Proof</h1>
              <span className={cn(
                "px-3 py-1 text-xs font-bold rounded uppercase tracking-widest shadow-sm",
                perturbation?.evidence?.classification === 'CONFIRMED' ? "bg-pass/10 text-pass border border-pass/30" : 
                perturbation?.evidence?.classification === 'STRONG_EVIDENCE' ? "bg-evidence/10 text-evidence border border-evidence/40" :
                perturbation?.evidence?.classification === 'NOT_IMPLICATED' ? "bg-secondary/10 text-secondary border border-secondary/30" :
                !isBehaviorChanged ? "bg-pass/10 text-pass border border-pass/30" :
                "bg-fail/10 text-fail border border-fail/30"
              )}>
                {perturbation?.evidence?.classification || comparison?.classification || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-secondary text-sm font-medium">
              Conducted {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="bg-[#08090A] border border-border/50 px-5 py-3 rounded-lg font-mono text-sm text-primary max-w-full overflow-x-auto shadow-inner">
            <span className="text-secondary select-none">$ </span>{command}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Warm vs Clean Comparison */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="bg-elevated/50 px-5 py-4 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold text-primary tracking-wide text-lg">1. Reproduce</h3>
            {isBehaviorChanged ? (
              <span className="text-xs text-fail font-bold flex items-center bg-fail/10 px-2.5 py-1 rounded border border-fail/20 shadow-sm uppercase tracking-wider">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Divergence Detected
              </span>
            ) : (
              <span className="text-xs text-pass font-bold flex items-center bg-pass/10 px-2.5 py-1 rounded border border-pass/20 shadow-sm uppercase tracking-wider">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Behavior Matches
              </span>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 flex-grow">
            <div className="border border-border/50 rounded-lg flex flex-col bg-[#08090A] overflow-hidden shadow-inner">
              <div className="px-4 py-2.5 border-b border-border/50 text-xs font-bold text-secondary uppercase tracking-widest flex justify-between bg-surface/30">
                <span>Warm (Local)</span>
                <span className={comparison?.warm?.exitCode === 0 ? 'text-pass' : 'text-fail'}>Exit {comparison?.warm?.exitCode}</span>
              </div>
              <pre className="p-4 text-xs font-mono text-primary/80 overflow-auto flex-grow max-h-56 whitespace-pre-wrap leading-relaxed">
                {comparison?.warm?.stderr || comparison?.warm?.stdout || 'No output'}
              </pre>
            </div>
            <div className="border border-border/50 rounded-lg flex flex-col bg-[#08090A] overflow-hidden shadow-inner">
              <div className="px-4 py-2.5 border-b border-border/50 text-xs font-bold text-secondary uppercase tracking-widest flex justify-between bg-surface/30">
                <span>Clean (Docker)</span>
                <span className={comparison?.clean?.exitCode === 0 ? 'text-pass' : 'text-fail'}>Exit {comparison?.clean?.exitCode}</span>
              </div>
              <pre className="p-4 text-xs font-mono text-primary/80 overflow-auto flex-grow max-h-56 whitespace-pre-wrap leading-relaxed">
                {comparison?.clean?.stderr || comparison?.clean?.stdout || 'No output'}
              </pre>
            </div>
          </div>
        </div>

        {/* Candidate Detection */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="bg-elevated/50 px-5 py-4 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold text-primary tracking-wide text-lg">2. Candidate Detection</h3>
            <span className="text-xs text-secondary font-bold uppercase tracking-widest">
              {candidates?.length || 0} Differences Found
            </span>
          </div>
          <div className="p-5 overflow-auto flex-grow max-h-72">
            {!candidates || candidates.length === 0 ? (
              <div className="text-center py-10 text-secondary text-sm bg-background/30 rounded-lg border border-border/30">
                No environment differences found between warm and clean execution.
              </div>
            ) : (
              <ul className="space-y-4">
                {candidates.map((c: any, i: number) => (
                  <li key={i} className="border border-border/80 rounded-lg p-4 bg-background/40 hover:bg-elevated/20 transition-colors shadow-sm">
                    <div className="flex justify-between mb-3 items-center">
                      <span className="font-mono text-base text-primary font-bold bg-surface px-2 py-0.5 rounded border border-border/50">{c.name}</span>
                      <span className="text-xs text-secondary font-bold bg-elevated px-2.5 py-1 rounded border border-border/50 uppercase tracking-widest">{c.type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-[#08090A] p-3 rounded-md border border-border/40 shadow-inner">
                      <div><span className="text-secondary text-xs uppercase font-bold tracking-wider block mb-1">Warm</span> <span className="font-mono text-primary/80 truncate block text-xs">{String(c.warmValue)}</span></div>
                      <div><span className="text-secondary text-xs uppercase font-bold tracking-wider block mb-1">Clean</span> <span className="font-mono text-primary/80 truncate block text-xs">{String(c.cleanValue)}</span></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Perturbation & Proof */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden mb-8 shadow-sm">
        <div className="bg-elevated/50 px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-primary tracking-wide text-lg">3. Perturbation & Causal Proof</h3>
        </div>
        <div className="p-6 md:p-8">
          {!isBehaviorChanged ? (
            <div className="text-center py-10 text-secondary bg-background/30 rounded-lg border border-border/30">
              <p className="font-medium text-primary">No behavioral divergence observed.</p>
              <p className="mt-1">Perturbation is not required.</p>
            </div>
          ) : !perturbation ? (
            <div className="text-center py-10 bg-background/30 rounded-lg border border-border/30">
              <div className="w-14 h-14 mx-auto mb-4 text-secondary rounded-full border border-border/80 flex items-center justify-center bg-elevated shadow-sm">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-primary mb-2">No Environment Cause Found</h4>
              <p className="text-secondary text-sm max-w-md mx-auto leading-relaxed">
                ColdProof detected a behavioral divergence but was unable to identify and successfully perturb a supported environment candidate to prove causality.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-5">Experimental Perturbation</h4>
                <div className="border border-border/50 rounded-lg bg-[#08090A] overflow-hidden mb-5 shadow-inner">
                  <div className="px-4 py-2.5 bg-surface/30 border-b border-border/50 text-xs font-bold text-secondary uppercase tracking-widest flex justify-between items-center">
                    <span className="text-primary/90 font-mono bg-elevated px-2 py-0.5 rounded border border-border/50">Block {perturbation.candidate?.name || 'Candidate'}</span>
                    <span className={perturbation.result?.exitCode === 0 ? 'text-pass' : 'text-fail'}>Exit {perturbation.result?.exitCode}</span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-primary/80 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                    {perturbation.result?.stderr || perturbation.result?.stdout || 'No output'}
                  </pre>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-5">Failure Signature Match</h4>
                <ul className="space-y-4 mb-6">
                  <li className="flex items-start bg-background/20 p-3 rounded-lg border border-border/30">
                    <div className={cn("mt-0.5 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm", perturbation.evidence?.candidateObserved ? "bg-pass/20 text-pass border border-pass/30" : "bg-fail/20 text-fail border border-fail/30")}>
                      {perturbation.evidence?.candidateObserved ? '✓' : '✗'}
                    </div>
                    <div>
                      <p className="text-sm text-primary font-bold">Candidate Observed</p>
                      <p className="text-xs text-secondary mt-0.5">The candidate was accessed during warm execution.</p>
                    </div>
                  </li>
                  <li className="flex items-start bg-background/20 p-3 rounded-lg border border-border/30">
                    <div className={cn("mt-0.5 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm", perturbation.evidence?.candidatePerturbed ? "bg-pass/20 text-pass border border-pass/30" : "bg-fail/20 text-fail border border-fail/30")}>
                      {perturbation.evidence?.candidatePerturbed ? '✓' : '✗'}
                    </div>
                    <div>
                      <p className="text-sm text-primary font-bold">Candidate Perturbed</p>
                      <p className="text-xs text-secondary mt-0.5">ColdProof successfully blocked or altered the candidate.</p>
                    </div>
                  </li>
                  <li className="flex items-start bg-background/20 p-3 rounded-lg border border-border/30">
                    <div className={cn("mt-0.5 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm", perturbation.evidence?.perturbedFailed ? "bg-pass/20 text-pass border border-pass/30" : "bg-fail/20 text-fail border border-fail/30")}>
                      {perturbation.evidence?.perturbedFailed ? '✓' : '✗'}
                    </div>
                    <div>
                      <p className="text-sm text-primary font-bold">Perturbed Execution Failed</p>
                      <p className="text-xs text-secondary mt-0.5">The modification caused a failure in the warm environment.</p>
                    </div>
                  </li>
                  <li className="flex items-start bg-background/20 p-3 rounded-lg border border-border/30">
                    <div className={cn("mt-0.5 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm", perturbation.evidence?.sameExitCode ? "bg-pass/20 text-pass border border-pass/30" : "bg-fail/20 text-fail border border-fail/30")}>
                      {perturbation.evidence?.sameExitCode ? '✓' : '✗'}
                    </div>
                    <div>
                      <p className="text-sm text-primary font-bold">Exit Code Match</p>
                      <p className="text-xs text-secondary mt-0.5">The perturbed failure exit code matches the clean failure exit code.</p>
                    </div>
                  </li>
                  <li className="flex items-start bg-background/20 p-3 rounded-lg border border-border/30">
                    <div className={cn("mt-0.5 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm", perturbation.evidence?.failureOutputComparable ? "bg-pass/20 text-pass border border-pass/30" : "bg-fail/20 text-fail border border-fail/30")}>
                      {perturbation.evidence?.failureOutputComparable ? '✓' : '✗'}
                    </div>
                    <div>
                      <p className="text-sm text-primary font-bold">Textual Signature Match</p>
                      <p className="text-xs text-secondary mt-0.5">The failure logs (stderr) are comparable between environments.</p>
                    </div>
                  </li>
                </ul>

                <div className={cn(
                  "p-5 rounded-lg border flex items-start gap-4 transition-all",
                  perturbation.evidence?.classification === 'CONFIRMED' ? "bg-pass/10 border-pass/40 shadow-[0_0_15px_rgba(111,175,134,0.15)]" : 
                  perturbation.evidence?.classification === 'STRONG_EVIDENCE' ? "bg-evidence/10 border-evidence/40 shadow-[0_0_15px_rgba(208,162,83,0.15)]" :
                  "bg-secondary/10 border-secondary/30"
                )}>
                  <div className={cn(
                    "mt-0.5 p-2 rounded-full border",
                    perturbation.evidence?.classification === 'CONFIRMED' ? "bg-pass/20 border-pass/50 text-pass" :
                    perturbation.evidence?.classification === 'STRONG_EVIDENCE' ? "bg-evidence/20 border-evidence/50 text-evidence" :
                    "bg-surface border-border text-secondary"
                  )}>
                    {perturbation.evidence?.classification === 'CONFIRMED' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    ) : perturbation.evidence?.classification === 'STRONG_EVIDENCE' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    )}
                  </div>
                  <div>
                    <h5 className={cn(
                      "font-extrabold text-base tracking-wide",
                      perturbation.evidence?.classification === 'CONFIRMED' ? "text-pass" : 
                      perturbation.evidence?.classification === 'STRONG_EVIDENCE' ? "text-evidence" :
                      "text-secondary"
                    )}>
                      {perturbation.evidence?.classification === 'CONFIRMED' ? "CAUSALITY CONFIRMED" : 
                       perturbation.evidence?.classification === 'STRONG_EVIDENCE' ? "STRONG EVIDENCE" : 
                       "NOT IMPLICATED"}
                    </h5>
                    <p className="text-sm text-primary mt-1.5 leading-relaxed">
                      {perturbation.evidence?.classification === 'CONFIRMED' 
                        ? `The environment candidate ${perturbation.candidate?.name} is confirmed as the cause of the failure.` 
                        : perturbation.evidence?.classification === 'STRONG_EVIDENCE'
                        ? `The environment candidate ${perturbation.candidate?.name} strongly correlates to the failure, but text signatures varied slightly.`
                        : `The environment candidate ${perturbation.candidate?.name} was perturbed but did not reproduce the clean failure signature.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
