'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function NewInvestigationPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [command, setCommand] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function setupProject() {
      if (!user) return;
      try {
        const idToken = await getToken();
        setToken(idToken);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (res.ok) {
          const projects = await res.json();
          if (projects.length > 0) {
            setProjectId(projects[0].id);
          } else {
            const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Default Project' })
            });
            if (createRes.ok) {
              const newProject = await createRes.json();
              setProjectId(newProject.id);
            }
          }
        }
      } catch {
        setProjectError('Failed to load or create project workspace.');
      }
    }
    if (user && !loading) {
      setupProject();
    }
  }, [user, loading, getToken]);

  // Poll for recent investigation after copying command
  useEffect(() => {
    if (!waiting || !projectId || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const recent = data.find((inv: any) =>
            inv.projectId === projectId &&
            (Date.now() - new Date(inv.createdAt).getTime() < 30000)
          );
          if (recent) {
            clearInterval(interval);
            router.push(`/investigations/${recent.id}`);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [waiting, projectId, token, router]);

  const effectiveCommand = command.trim() || 'your-command';
  const displayCommand = `node /path/to/ColdProof/cli/dist/index.js investigate "${effectiveCommand.replace(/"/g, '\\"')}"`;
  const fullCliCommand = projectId && token
    ? `export COLDPROOF_API_URL="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}"\nexport COLDPROOF_TOKEN="${token}"\nexport COLDPROOF_PROJECT_ID="${projectId}"\n${displayCommand}`
    : '';

  const copyToClipboard = () => {
    if (!fullCliCommand) return;
    navigator.clipboard.writeText(fullCliCommand);
    setCopied(true);
    setWaiting(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !user) return null;

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary tracking-tight mb-1.5">New Investigation</h1>
        <p className="text-secondary text-sm">
          Find which environment difference is actually causing your failure.
        </p>
      </div>

      {/* How it works — compact info block */}
      <div className="bg-experiment/8 border border-experiment/20 rounded-lg p-4 mb-7 flex gap-3">
        <svg className="w-4 h-4 text-experiment flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm text-primary font-semibold mb-0.5">How ColdProof works</p>
          <p className="text-xs text-secondary leading-relaxed">
            The browser does <strong className="text-primary">not</strong> execute your command.
            ColdProof runs strictly on your local machine via the CLI, isolating execution in Docker to prove causality.
            Results are uploaded automatically when the investigation completes.
          </p>
        </div>
      </div>

      {projectError && (
        <div className="bg-fail/10 border border-fail/25 text-fail p-4 rounded-lg text-sm mb-6">
          {projectError}
        </div>
      )}

      {/* Step 1 */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">
          1 · Enter the failing command
        </h2>
        <div className="flex items-center gap-2 bg-[#08090A] border border-border/60 rounded-lg px-3 py-2 focus-within:border-experiment/50 transition-colors">
          <span className="text-secondary/60 font-mono text-sm select-none">$</span>
          <input
            type="text"
            className="flex-1 bg-transparent text-primary font-mono text-sm focus:outline-none placeholder:text-secondary/40"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="npm test"
            autoFocus
          />
        </div>
        <p className="text-xs text-secondary mt-2.5 leading-relaxed">
          Run this command from your project&apos;s root directory. ColdProof supports Node.js projects (npm/yarn/pnpm) out of the box.
          Other languages may work if their runtime is available in the Docker container.
        </p>
      </div>

      {/* Step 2 */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-5">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">
          2 · Run ColdProof from your project root
        </h2>
        <p className="text-xs text-secondary mb-4 leading-relaxed">
          Copy and run this in your terminal from <strong className="text-primary">your project&apos;s root directory</strong>.
          The investigation runs locally — warm execution, then Docker clean execution, then perturbation.
        </p>

        {projectId && token ? (
          <div className="relative">
            <pre className="bg-[#08090A] border border-border/60 px-4 py-4 rounded-lg font-mono text-xs text-primary overflow-x-auto whitespace-pre-wrap pr-20 leading-relaxed">
              <span className="text-secondary/50 select-none">$ </span>{displayCommand}
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2.5 right-2.5 bg-elevated hover:bg-border/60 border border-border text-secondary hover:text-primary px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5"
              title="Copies the full authenticated command"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3 text-pass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-pass">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-[#08090A] border border-border/50 p-4 rounded-lg text-secondary/50 text-xs">
            Setting up workspace context...
          </div>
        )}

        {/* Flow visual */}
        <div className="mt-4 flex items-center gap-2 text-xs font-mono tracking-widest">
          <span className="text-secondary/70">Warm</span>
          <span className="text-secondary/30">→</span>
          <span className="text-secondary/70">Clean</span>
          <span className="text-secondary/30">→</span>
          <span className="text-secondary/70">Compare</span>
          <span className="text-secondary/30">→</span>
          <span className="text-secondary/70">Perturb</span>
          <span className="text-secondary/30">→</span>
          <span className="text-experiment/70">Prove</span>
        </div>
      </div>

      {/* Waiting state */}
      {waiting && (
        <div className="bg-surface border border-border rounded-lg p-8 flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-experiment/30 border-t-experiment rounded-full animate-spin mb-4" />
          <h3 className="text-base font-semibold text-primary mb-1">Awaiting telemetry…</h3>
          <p className="text-secondary text-sm text-center max-w-xs leading-relaxed">
            Run the copied command in your terminal. This page will redirect automatically when ColdProof uploads the results.
          </p>
        </div>
      )}
    </div>
  );
}
