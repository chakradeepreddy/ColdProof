'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function NewInvestigationPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [command, setCommand] = useState('');
  const [coldproofPath, setColdproofPath] = useState('');
  const [showAlternative, setShowAlternative] = useState(false);
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
  const effectivePath = coldproofPath.trim() || '/path/to/ColdProof';
  // Primary: global npm install
  const primaryDisplayCommand = `coldproof investigate "${effectiveCommand.replace(/"/g, '\\"')}"`;
  // Alternative: direct node invocation (demo fallback)
  const altDisplayCommand = `node ${effectivePath}/cli/dist/index.js investigate "${effectiveCommand.replace(/"/g, '\\"')}"`;
  const envPrefix = projectId && token
    ? `export COLDPROOF_API_URL="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}"\nexport COLDPROOF_TOKEN="${token}"\nexport COLDPROOF_PROJECT_ID="${projectId}"`
    : '';
  const fullCliCommand = envPrefix ? `${envPrefix}\n${primaryDisplayCommand}` : '';
  const fullAltCommand = envPrefix && coldproofPath.trim() ? `${envPrefix}\n${altDisplayCommand}` : '';

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setWaiting(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !user) return null;

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary tracking-tight mb-1.5">New Investigation</h1>
        <p className="text-secondary text-sm">
          Find which environment difference is actually causing your failure.
        </p>
      </div>

      {/* How it works — compact info block */}
      <div className="bg-experiment/8 border border-experiment/20 rounded-xl p-4 mb-7 flex gap-3 animate-slide-up" style={{animationDelay:'40ms'}}>
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
      <div className="bg-surface border border-border rounded-xl p-5 mb-4 animate-slide-up" style={{animationDelay:'80ms'}}>
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
          Provide the exact command from your normal development or CI workflow that reproduces the issue (e.g., <code className="text-primary font-mono bg-elevated px-1 py-0.5 rounded">npm run build</code>, <code className="text-primary font-mono bg-elevated px-1 py-0.5 rounded">npm run test</code>, or <code className="text-primary font-mono bg-elevated px-1 py-0.5 rounded">npm run typecheck</code>). You don't need to know what's causing the failure. ColdProof compares the environments and tests candidate differences to find evidence for the cause.
        </p>
      </div>

      {/* Step 2 */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-5 animate-slide-up" style={{animationDelay:'160ms'}}>
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">
          2 · Run ColdProof locally
        </h2>

        <div className="text-xs text-secondary mb-3 leading-relaxed">
          <p className="text-sm font-semibold text-primary mb-1">From your project&apos;s root directory:</p>
          <p>Install once: <code className="text-primary font-mono bg-elevated px-1 py-0.5 rounded">npm install -g coldproof</code></p>
        </div>

        {projectId && token ? (
          <div className="relative mb-3">
            <pre className="bg-[#08090A] border border-border/60 px-4 py-4 rounded-lg font-mono text-xs text-primary overflow-x-auto whitespace-pre-wrap pr-20 leading-relaxed">
              <span className="text-secondary/50 select-none">$ </span>{primaryDisplayCommand}
            </pre>
            <button
              onClick={() => copyToClipboard(fullCliCommand)}
              disabled={!fullCliCommand}
              className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                !fullCliCommand
                  ? 'bg-elevated/50 border-border/30 text-secondary/30 cursor-not-allowed border'
                  : 'bg-elevated hover:bg-border/60 border border-border text-secondary hover:text-primary'
              }`}
              title="Copies the full authenticated command (with env vars)"
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
          <div className="bg-[#08090A] border border-border/50 p-4 rounded-lg text-secondary/50 text-xs mb-3">
            Setting up workspace context...
          </div>
        )}

        <div className="text-xs text-secondary leading-relaxed mb-4">
          <p className="bg-experiment/5 border border-experiment/10 p-2.5 rounded">
            Run from the <strong className="text-primary">root of the project being investigated</strong>.
            ColdProof runs locally using Docker for clean execution. Results are uploaded automatically.
          </p>
        </div>

        {/* Alternative: direct node invocation */}
        <div className="border-t border-border/40 pt-3">
          <button
            onClick={() => setShowAlternative(v => !v)}
            className="text-xs text-secondary/60 hover:text-secondary flex items-center gap-1 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showAlternative ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            Alternative: run without global install
          </button>
          {showAlternative && (
            <div className="mt-3">
              <div className="mb-2">
                <label className="block text-xs text-secondary/70 mb-1">ColdProof directory path on your machine</label>
                <div className="flex items-center gap-2 bg-[#08090A] border border-border/60 rounded-lg px-3 py-2 focus-within:border-experiment/50 transition-colors">
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-primary font-mono text-sm focus:outline-none placeholder:text-secondary/40"
                    value={coldproofPath}
                    onChange={(e) => setColdproofPath(e.target.value)}
                    placeholder="/path/to/ColdProof"
                  />
                </div>
              </div>
              {projectId && token ? (
                <div className="relative">
                  <pre className="bg-[#08090A] border border-border/60 px-4 py-3 rounded-lg font-mono text-xs text-primary overflow-x-auto whitespace-pre-wrap pr-20 leading-relaxed">
                    <span className="text-secondary/50 select-none">$ </span>{altDisplayCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(fullAltCommand)}
                    disabled={!coldproofPath.trim() || !fullAltCommand}
                    className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                      !coldproofPath.trim()
                        ? 'bg-elevated/50 border-border/30 text-secondary/30 cursor-not-allowed border'
                        : 'bg-elevated hover:bg-border/60 border border-border text-secondary hover:text-primary'
                    }`}
                    title={!coldproofPath.trim() ? 'Enter ColdProof directory path first' : 'Copy alternative command'}
                  >
                    Copy
                  </button>
                </div>
              ) : null}
              {!coldproofPath.trim() && (
                <p className="text-xs text-secondary/60 mt-1">Enter your ColdProof directory path to enable Copy.</p>
              )}
            </div>
          )}
        </div>

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
