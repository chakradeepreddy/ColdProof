'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// ─── Inline copy button ────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
        copied
          ? 'bg-pass/15 border border-pass/30 text-pass'
          : 'bg-elevated hover:bg-border/50 border border-border text-secondary hover:text-primary'
      }`}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ─── Code block with copy ──────────────────────────────────────────
function CommandBlock({ command, muted = false }: { command: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 font-mono ${
      muted ? 'bg-elevated/50 border-border/40' : 'bg-[#08090A] border-border/60'
    }`}>
      <span className="text-sm text-primary/80 flex-1 min-w-0 overflow-x-auto">
        <span className="text-secondary/40 select-none mr-1.5">$</span>
        {command}
      </span>
      <CopyButton text={command} />
    </div>
  );
}

// ─── Step number ───────────────────────────────────────────────────
function StepNum({ n }: { n: number }) {
  return (
    <div className="w-6 h-6 rounded-full bg-experiment/15 border border-experiment/30 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-experiment">{n}</span>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────
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
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    async function setupProject() {
      if (!user) return;
      try {
        const idToken = await getToken();
        setToken(idToken);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const projects = await res.json();
          if (projects.length > 0) {
            setProjectId(projects[0].id);
          } else {
            const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Default Project' }),
            });
            if (createRes.ok) setProjectId((await createRes.json()).id);
          }
        }
      } catch {
        setProjectError('Failed to load or create project workspace.');
      }
    }
    if (user && !loading) setupProject();
  }, [user, loading, getToken]);

  useEffect(() => {
    if (!waiting || !projectId || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const recent = data.find(
            (inv: any) => inv.projectId === projectId && Date.now() - new Date(inv.createdAt).getTime() < 30000
          );
          if (recent) { clearInterval(interval); router.push(`/investigations/${recent.id}`); }
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [waiting, projectId, token, router]);

  const effectiveCommand = command.trim() || 'npm run build';
  const effectivePath = coldproofPath.trim() || '/path/to/ColdProof';
  const primaryDisplayCommand = `coldproof investigate "${effectiveCommand.replace(/"/g, '\\"')}"`;
  const altDisplayCommand = `node ${effectivePath}/cli/dist/index.js investigate "${effectiveCommand.replace(/"/g, '\\"')}"`;
  const envPrefix = projectId && token
    ? `export COLDPROOF_API_URL="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}"\nexport COLDPROOF_TOKEN="${token}"\nexport COLDPROOF_PROJECT_ID="${projectId}"`
    : '';
  const fullCliCommand = envPrefix ? `${envPrefix}\n${primaryDisplayCommand}` : '';
  const fullAltCommand = envPrefix && coldproofPath.trim() ? `${envPrefix}\n${altDisplayCommand}` : '';

  const copyToClipboard = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setWaiting(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (loading || !user) return null;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-primary tracking-tight mb-1.5">New Investigation</h1>
        <p className="text-secondary text-sm">
          You don&apos;t need to know what&apos;s causing the failure. ColdProof compares environments and tests candidate differences to find evidence for the cause.
        </p>
      </div>

      {projectError && (
        <div className="bg-fail/8 border border-fail/25 text-fail p-4 rounded-xl text-sm mb-6 animate-slide-up">
          {projectError}
        </div>
      )}

      {/* Installation block */}
      <div className="bg-surface border border-border rounded-2xl mb-5 overflow-hidden animate-slide-up" style={{ animationDelay: '60ms' }}>
        <div className="px-5 py-4 border-b border-border bg-elevated/20 flex items-center gap-3">
          <StepNum n={1} />
          <div>
            <h2 className="text-sm font-bold text-primary">Install ColdProof</h2>
            <p className="text-xs text-secondary mt-0.5">Once per machine</p>
          </div>
        </div>
        <div className="p-5">
          <CommandBlock command="npm install -g coldproof" />
          <p className="text-xs text-secondary/60 mt-2.5 leading-relaxed">
            Requires Node.js and Docker. Docker must be running during investigation.
          </p>
        </div>
      </div>

      {/* Command input */}
      <div className="bg-surface border border-border rounded-2xl mb-5 overflow-hidden animate-slide-up" style={{ animationDelay: '120ms' }}>
        <div className="px-5 py-4 border-b border-border bg-elevated/20 flex items-center gap-3">
          <StepNum n={2} />
          <div>
            <h2 className="text-sm font-bold text-primary">What command normally fails?</h2>
            <p className="text-xs text-secondary mt-0.5">Your regular development or CI command</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 bg-[#08090A] border border-border/60 rounded-lg px-3 py-2.5 focus-within:border-experiment/50 transition-colors">
            <span className="text-secondary/50 font-mono text-sm select-none">$</span>
            <input
              type="text"
              className="flex-1 bg-transparent text-primary font-mono text-sm focus:outline-none placeholder:text-secondary/30"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="npm run build"
              autoFocus
            />
          </div>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {['npm run build', 'npm test', 'npm run typecheck'].map(ex => (
              <button
                key={ex}
                onClick={() => setCommand(ex)}
                className="text-xs font-mono text-secondary/60 hover:text-primary bg-elevated hover:bg-border/40 border border-border/50 px-2 py-0.5 rounded transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Run command */}
      <div className="bg-surface border border-border rounded-2xl mb-5 overflow-hidden animate-slide-up" style={{ animationDelay: '180ms' }}>
        <div className="px-5 py-4 border-b border-border bg-elevated/20 flex items-center gap-3">
          <StepNum n={3} />
          <div>
            <h2 className="text-sm font-bold text-primary">Run from your project&apos;s root directory</h2>
            <p className="text-xs text-secondary mt-0.5">ColdProof executes locally, uploads results automatically</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Info */}
          <div className="bg-experiment/5 border border-experiment/15 rounded-xl p-3.5 text-xs text-secondary leading-relaxed">
            <p className="font-semibold text-primary mb-0.5">How it works</p>
            ColdProof runs your command in your warm environment, then in a clean Docker container, detects environmental differences, perturbs each candidate, and produces structured evidence. Results are uploaded automatically.
          </div>

          {/* Primary command */}
          {projectId && token ? (
            <div>
              <p className="text-xs text-secondary/60 font-mono uppercase tracking-widest mb-2">Command to run</p>
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-[#08090A] border-border/60 px-4 py-3.5 font-mono">
                <span className="text-sm text-primary/85 flex-1 min-w-0 overflow-x-auto whitespace-pre">
                  <span className="text-secondary/40 select-none mr-1.5">$</span>{primaryDisplayCommand}
                </span>
                <button
                  onClick={() => copyToClipboard(fullCliCommand)}
                  disabled={!fullCliCommand}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 shrink-0 ${
                    !fullCliCommand
                      ? 'bg-elevated/50 border border-border/30 text-secondary/30 cursor-not-allowed'
                      : copied
                      ? 'bg-pass/15 border border-pass/30 text-pass'
                      : 'bg-experiment/15 hover:bg-experiment/25 border border-experiment/30 text-experiment hover:text-experiment'
                  }`}
                  title="Copies the full authenticated command with env vars"
                >
                  {copied ? (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>Copied</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                  )}
                </button>
              </div>
              <p className="text-xs text-secondary/50 mt-1.5 leading-relaxed">
                The Copy button includes authentication credentials. Run from the root of the project being investigated.
              </p>
            </div>
          ) : (
            <div className="bg-[#08090A] border border-border/50 p-4 rounded-xl text-secondary/40 text-xs flex items-center gap-2">
              <span className="w-3.5 h-3.5 border border-secondary/20 border-t-secondary/40 rounded-full animate-spin" />
              Preparing workspace context…
            </div>
          )}

          {/* Pipeline flow */}
          <div className="flex items-center gap-1.5 text-xs font-mono tracking-widest pt-1 flex-wrap">
            {['Warm', 'Clean', 'Compare', 'Perturb', 'Prove'].map((s, i, arr) => (
              <React.Fragment key={s}>
                <span className={i === arr.length - 1 ? 'text-experiment/70' : 'text-secondary/50'}>{s}</span>
                {i < arr.length - 1 && <span className="text-secondary/25">→</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Alternative */}
          <div className="border-t border-border/30 pt-3">
            <button
              onClick={() => setShowAlternative(v => !v)}
              className="text-xs text-secondary/50 hover:text-secondary flex items-center gap-1 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-150 ${showAlternative ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              Alternative: run without global install
            </button>
            {showAlternative && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs text-secondary/60 mb-1">Local ColdProof directory path</label>
                  <div className="flex items-center gap-2 bg-[#08090A] border border-border/60 rounded-lg px-3 py-2 focus-within:border-experiment/50 transition-colors">
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-primary font-mono text-sm focus:outline-none placeholder:text-secondary/30"
                      value={coldproofPath}
                      onChange={(e) => setColdproofPath(e.target.value)}
                      placeholder="/Users/you/ColdProof"
                    />
                  </div>
                </div>
                {projectId && token && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border bg-[#08090A] border-border/60 px-4 py-3 font-mono">
                    <span className="text-xs text-primary/70 flex-1 min-w-0 overflow-x-auto whitespace-pre">
                      <span className="text-secondary/40 select-none mr-1.5">$</span>{altDisplayCommand}
                    </span>
                    <button
                      onClick={() => copyToClipboard(fullAltCommand)}
                      disabled={!coldproofPath.trim() || !fullAltCommand}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 shrink-0 ${
                        !coldproofPath.trim()
                          ? 'text-secondary/30 cursor-not-allowed'
                          : 'bg-elevated hover:bg-border/50 border border-border text-secondary hover:text-primary'
                      }`}
                    >
                      Copy
                    </button>
                  </div>
                )}
                {!coldproofPath.trim() && (
                  <p className="text-xs text-secondary/40">Enter your local ColdProof path to enable copy.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Waiting state */}
      {waiting && (
        <div className="bg-surface border border-experiment/20 rounded-2xl p-8 flex flex-col items-center animate-scale-in">
          <div className="w-8 h-8 border-2 border-experiment/30 border-t-experiment rounded-full animate-spin mb-4" />
          <h3 className="text-base font-semibold text-primary mb-1">Awaiting results…</h3>
          <p className="text-secondary text-sm text-center max-w-xs leading-relaxed">
            Run the copied command in your terminal. This page will redirect automatically when ColdProof uploads the investigation results.
          </p>
        </div>
      )}
    </div>
  );
}
