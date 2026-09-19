'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// ─── Copy button ────────────────────────────────────────────────────
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

// ─── Command block ──────────────────────────────────────────────────
function CommandBlock({ command, muted = false }: { command: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 font-mono ${
      muted ? 'bg-elevated/40 border-border/35' : 'bg-[#08090A] border-border/60'
    }`}>
      <span className="text-sm text-primary/80 flex-1 min-w-0 overflow-x-auto">
        <span className="text-secondary/35 select-none mr-1.5">$</span>
        {command}
      </span>
      <CopyButton text={command} />
    </div>
  );
}

// ─── Step circle ───────────────────────────────────────────────────
function StepNum({ n }: { n: number }) {
  return (
    <div className="w-7 h-7 rounded-full bg-experiment text-[#0B0D0F] flex items-center justify-center shrink-0 shadow-sm">
      <span className="text-xs font-bold">{n}</span>
    </div>
  );
}

// ─── Mini pipeline row ─────────────────────────────────────────────
function MiniPipeline() {
  const stages = [
    { label: 'WARM', color: 'text-pass' },
    { label: 'CLEAN', color: 'text-fail' },
    { label: 'COMPARE', color: 'text-secondary/60' },
    { label: 'PERTURB', color: 'text-experiment' },
    { label: 'PROVE', color: 'text-evidence' },
  ];
  return (
    <div className="flex items-center gap-1 text-[10px] font-mono tracking-[0.14em] flex-wrap">
      {stages.map((s, i, arr) => (
        <React.Fragment key={s.label}>
          <span className={`font-bold ${s.color}`}>{s.label}</span>
          {i < arr.length - 1 && <span className="text-secondary/20">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Waiting pipeline ──────────────────────────────────────────────
function WaitingPipeline() {
  const stages = ['WARM', 'CLEAN', 'PERTURB', 'PROVE'];
  const colors = ['text-pass', 'text-fail', 'text-experiment', 'text-evidence'];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % stages.length), 1400);
    return () => clearInterval(t);
  }, [stages.length]);

  return (
    <div className="flex items-center justify-center gap-2 mt-4 text-xs font-mono tracking-widest">
      {stages.map((s, i) => (
        <React.Fragment key={s}>
          <span className={`font-bold transition-all duration-500 ${
            i === active ? colors[i] + ' opacity-100 scale-110' : 'text-secondary/25 opacity-60'
          }`}>{s}</span>
          {i < stages.length - 1 && (
            <span className={`transition-all duration-500 ${i < active ? 'text-secondary/40' : 'text-secondary/15'}`}>→</span>
          )}
        </React.Fragment>
      ))}
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
  const [terminal, setTerminal] = useState<'mac' | 'cmd' | 'ps'>('mac');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

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
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  let envPrefix = '';
  if (projectId && token) {
    if (terminal === 'mac') {
      envPrefix = `export COLDPROOF_API_URL="${apiUrl}"\nexport COLDPROOF_TOKEN="${token}"\nexport COLDPROOF_PROJECT_ID="${projectId}"`;
    } else if (terminal === 'cmd') {
      envPrefix = `set "COLDPROOF_API_URL=${apiUrl}"\nset "COLDPROOF_TOKEN=${token}"\nset "COLDPROOF_PROJECT_ID=${projectId}"`;
    } else if (terminal === 'ps') {
      envPrefix = `$env:COLDPROOF_API_URL="${apiUrl}"\n$env:COLDPROOF_TOKEN="${token}"\n$env:COLDPROOF_PROJECT_ID="${projectId}"`;
    }
  }

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
        <p className="text-secondary text-sm leading-relaxed">
          You don&apos;t need to know what&apos;s causing the failure.{' '}
          <span className="text-primary/80">Give ColdProof the command that fails.</span> It will compare environments, test candidate differences, and produce evidence.
        </p>
      </div>

      {projectError && (
        <div className="bg-fail/8 border border-fail/25 text-fail p-4 rounded-xl text-sm mb-6 animate-slide-up">
          {projectError}
        </div>
      )}

      {/* ── Step 1: Install ── */}
      <div className="bg-surface border border-border rounded-2xl mb-4 overflow-hidden animate-slide-up" style={{ animationDelay: '60ms' }}>
        <div className="px-5 py-4 border-b border-border bg-elevated/10 flex items-center gap-3">
          <StepNum n={1} />
          <div>
            <h2 className="text-sm font-bold text-primary">Install ColdProof</h2>
            <p className="text-xs text-secondary/60 mt-0.5">Once per machine · requires Node.js 22+ and Docker</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] text-secondary/50 uppercase tracking-[0.16em] font-mono mb-2">Install</p>
            <CommandBlock command="npm install -g coldproof@0.1.6" />
          </div>
          <div>
            <p className="text-[10px] text-secondary/50 uppercase tracking-[0.16em] font-mono mb-2">Verify CLI is on your PATH</p>
            <CommandBlock command="coldproof --help" muted />
          </div>

          <details className="group mt-2 cursor-pointer border-t border-border/30 pt-3">
            <summary className="text-[11px] text-primary/70 hover:text-primary transition-colors select-none font-medium outline-none inline-flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="group-open:rotate-90 transition-transform text-secondary/40">
                <path d="M3.5 2L7 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Troubleshooting: `coldproof` command not found
            </summary>
            <div className="mt-3 ml-1.5 pl-3 border-l border-border/60 space-y-4 text-xs text-secondary/60 leading-relaxed">
              <p>Installed successfully, but your terminal says <code className="font-mono bg-elevated/50 px-1 rounded text-[10px]">coldproof: command not found</code>?</p>
              <p>Your npm global executable directory may not be included in your PATH.</p>
              
              <div className="space-y-1.5">
                <p className="font-medium text-secondary/80">STEP 1 &mdash; Find npm&apos;s global directory</p>
                <CommandBlock command="npm prefix -g" muted />
                <p className="text-[11px] text-secondary/50">This shows where npm installs global packages.</p>
              </div>

              <div className="space-y-1.5">
                <p className="font-medium text-secondary/80">STEP 2 &mdash; Add npm&apos;s global bin directory to PATH</p>
                <div className="bg-elevated/40 border border-border/35 rounded-lg p-3 font-mono text-xs text-primary/80 overflow-x-auto whitespace-pre select-all">
                  echo 'export PATH="$(npm prefix -g)/bin:$PATH"' &gt;&gt; ~/.zshrc<br/>
                  source ~/.zshrc<br/>
                  rehash
                </div>
                <p className="text-[11px] text-secondary/50">This adds npm&apos;s global executable directory to your PATH.</p>
              </div>

              <div className="space-y-1.5">
                <p className="font-medium text-secondary/80">STEP 3 &mdash; Verify ColdProof</p>
                <CommandBlock command="coldproof --version" muted />
                <p className="text-[11px] text-secondary/50">Expected: 0.1.6</p>
              </div>

              <div className="border-t border-border/30 pt-3 mt-3">
                <p className="text-[11px] text-secondary/50 mb-1.5">Using Bash instead of zsh?</p>
                <div className="bg-elevated/40 border border-border/35 rounded-lg p-3 font-mono text-[11px] text-primary/70 overflow-x-auto whitespace-pre mb-2 select-all">
                  echo 'export PATH="$(npm prefix -g)/bin:$PATH"' &gt;&gt; ~/.bash_profile<br/>
                  source ~/.bash_profile
                </div>
                <CommandBlock command="coldproof --version" muted />
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* ── Step 2: Command ── */}
      <div className="bg-surface border border-border rounded-2xl mb-4 overflow-hidden animate-slide-up" style={{ animationDelay: '120ms' }}>
        <div className="px-5 py-4 border-b border-border bg-elevated/10 flex items-center gap-3">
          <StepNum n={2} />
          <div>
            <h2 className="text-sm font-bold text-primary">What command should ColdProof investigate?</h2>
            <p className="text-xs text-secondary/60 mt-0.5">Enter a real build, test, typecheck, or CI command used by this project.</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 bg-[#08090A] border border-border/60 rounded-lg px-3 py-2.5 focus-within:border-experiment/50 focus-within:shadow-[0_0_0_2px_rgba(110,156,203,0.08)] transition-all duration-150">
            <span className="text-secondary/40 font-mono text-sm select-none">$</span>
            <input
              type="text"
              className="flex-1 bg-transparent text-primary font-mono text-sm focus:outline-none placeholder:text-secondary/25"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="npm run build"
              autoFocus
            />
          </div>
          
          <div className="mt-4 text-xs text-secondary/60 leading-relaxed">
            <p className="mb-2">
              <strong className="text-secondary/80 font-medium">Not sure which command to use?</strong><br/>
              Open your project&apos;s <code className="bg-elevated border border-border/40 px-1 py-0.5 rounded text-[10px] font-mono text-secondary/70">package.json</code> and check the &apos;scripts&apos; section. Choose the command you normally use to build, test, lint, or type-check your project.
            </p>
            <p className="mb-3">
              <strong className="text-experiment/90 font-medium">Important:</strong> Don&apos;t randomly pick a command. Use a command that actually belongs to your project and runs successfully in your normal environment.
            </p>
            
            <details className="group mb-4 cursor-pointer">
              <summary className="text-[11px] text-primary/70 hover:text-primary transition-colors select-none font-medium outline-none inline-flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="group-open:rotate-90 transition-transform text-secondary/40">
                  <path d="M3.5 2L7 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                How do I find mine?
              </summary>
              <div className="mt-2.5 ml-1.5 pl-3 border-l border-border/60 space-y-1.5 text-[11px] text-secondary/50">
                <p>1. Open <code className="font-mono bg-elevated/50 px-1 rounded text-[10px]">package.json</code></p>
                <p>2. Find <code className="font-mono bg-elevated/50 px-1 rounded text-[10px]">&quot;scripts&quot;</code></p>
                <p>3. Look for build, test, typecheck, or lint</p>
                <p>4. Run the command normally once to confirm it works</p>
                <p>5. Enter that same command here</p>
              </div>
            </details>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30 flex-wrap">
            <span className="text-[10px] text-secondary/40 uppercase tracking-[0.16em] font-mono mr-2">Common examples:</span>
            {['npm run build', 'npm test', 'npm run typecheck'].map(ex => (
              <button
                key={ex}
                onClick={() => setCommand(ex)}
                className="text-xs font-mono text-secondary/50 hover:text-primary bg-elevated/50 hover:bg-border/40 border border-border/40 px-2 py-1 rounded transition-colors duration-150"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step 3: Run ── */}
      <div className="bg-surface border border-border rounded-2xl mb-4 overflow-hidden animate-slide-up" style={{ animationDelay: '180ms' }}>
        <div className="px-5 py-4 border-b border-border bg-elevated/10 flex items-center gap-3">
          <StepNum n={3} />
          <div>
            <h2 className="text-sm font-bold text-primary">Run from your project&apos;s root directory</h2>
            <p className="text-xs text-secondary/60 mt-0.5">ColdProof executes locally · results upload automatically</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Pipeline context */}
          <div className="bg-[#0D0F11] border border-border/40 rounded-xl p-4">
            <p className="text-[10px] text-secondary/50 uppercase tracking-[0.16em] font-mono mb-3">What ColdProof does</p>
            <MiniPipeline />
            <p className="text-xs text-secondary/50 mt-3 leading-relaxed">
              Runs in your warm environment and a clean Docker container. Detects environment differences. Perturbs each candidate. Produces structured evidence.
            </p>
          </div>

          {/* Primary command */}
          {projectId && token ? (
            <div>
              <p className="text-[10px] text-secondary/50 uppercase tracking-[0.16em] font-mono mb-2">Choose your terminal</p>
              <div className="flex gap-2 mb-3">
                {[
                  { id: 'mac', label: 'macOS / Linux' },
                  { id: 'cmd', label: 'Windows CMD' },
                  { id: 'ps', label: 'Windows PowerShell' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTerminal(t.id as any)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors duration-150 ${
                      terminal === t.id
                        ? 'bg-primary text-background'
                        : 'bg-elevated/50 text-secondary/70 hover:bg-border/40'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border bg-[#08090A] border-border/60 px-4 py-3.5 font-mono">
                <span className="text-sm text-primary/85 flex-1 min-w-0 overflow-x-auto whitespace-pre">
                  <span className="text-secondary/35 select-none mr-1.5">$</span>{primaryDisplayCommand}
                </span>
                <button
                  onClick={() => copyToClipboard(fullCliCommand)}
                  disabled={!fullCliCommand}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 shrink-0 ${
                    !fullCliCommand
                      ? 'bg-elevated/50 border border-border/30 text-secondary/30 cursor-not-allowed'
                      : copied
                      ? 'bg-pass/15 border border-pass/30 text-pass'
                      : 'bg-experiment/15 hover:bg-experiment/25 border border-experiment/30 text-experiment'
                  }`}
                  title="Copies the full authenticated command with env vars"
                >
                  {copied ? (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>Copied</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                  )}
                </button>
              </div>
              <p className="text-xs text-secondary/45 mt-1.5 leading-relaxed">
                Click <strong className="text-secondary/70">Copy</strong> to grab the setup commands, paste them into your terminal, then run your investigation from the project root. (These commands securely set variables for your current terminal session).
              </p>
            </div>
          ) : (
            <div className="bg-[#08090A] border border-border/40 p-4 rounded-xl text-secondary/40 text-xs flex items-center gap-2">
              <span className="w-3.5 h-3.5 border border-secondary/20 border-t-secondary/40 rounded-full animate-spin" />
              Preparing workspace context…
            </div>
          )}

          {/* Alternative */}
          <div className="border-t border-border/25 pt-3">
            <button
              onClick={() => setShowAlternative(v => !v)}
              className="text-xs text-secondary/45 hover:text-secondary flex items-center gap-1 transition-colors duration-150"
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
                  <p className="text-xs text-secondary/35">Enter your local ColdProof path to enable copy.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Waiting state */}
      {waiting && (
        <div className="bg-surface border border-experiment/20 rounded-2xl p-8 flex flex-col items-center animate-scale-in">
          <div className="w-8 h-8 border-2 border-experiment/25 border-t-experiment rounded-full animate-spin mb-5" />
          <h3 className="text-base font-semibold text-primary mb-1.5">Awaiting results…</h3>
          <p className="text-secondary text-sm text-center max-w-xs leading-relaxed mb-2">
            Run the copied command in your terminal. This page will redirect automatically when ColdProof uploads the investigation results.
          </p>
          <WaitingPipeline />
        </div>
      )}
    </div>
  );
}
