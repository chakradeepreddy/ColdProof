'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('revealed'); obs.unobserve(e.target); } }),
      { threshold: 0.06 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ─── Logo mark ────────────────────────────────────────────────────────────────
function LogoMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 1.5" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <span className="text-[10px] font-mono text-secondary/35 tracking-[0.2em] uppercase select-none">{step}</span>
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-[10px] font-mono text-secondary/35 tracking-[0.2em] uppercase select-none">{title}</span>
    </div>
  );
}

// ─── Pipeline stage ───────────────────────────────────────────────────────────
function PipelineStage({
  label, description, color, index, total,
}: {
  label: string; description: string;
  color: 'experiment' | 'pass' | 'evidence';
  index: number; total: number;
}) {
  const colorMap = {
    experiment: { ring: 'bg-experiment/10 border-experiment/50', dot: 'bg-experiment', text: 'text-experiment', glow: 'shadow-[0_0_16px_rgba(110,156,203,0.15)]' },
    pass:       { ring: 'bg-pass/10 border-pass/50',             dot: 'bg-pass',       text: 'text-pass',       glow: 'shadow-[0_0_16px_rgba(111,175,134,0.15)]' },
    evidence:   { ring: 'bg-evidence/10 border-evidence/50',     dot: 'bg-evidence',   text: 'text-evidence',   glow: 'shadow-[0_0_16px_rgba(208,162,83,0.15)]' },
  }[color];

  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4 transition-all duration-300 hover:scale-105 ${colorMap.ring} ${colorMap.glow}`}>
        <div className={`w-5 h-5 rounded-full ${colorMap.dot}`} />
      </div>
      {/* Label */}
      <p className={`text-xs font-bold uppercase tracking-[0.18em] mb-2 ${colorMap.text}`}>{label}</p>
      <p className="text-xs text-secondary/60 text-center leading-relaxed max-w-[140px]">{description}</p>
      {/* Connector */}
      {index < total - 1 && (
        <div className="hidden sm:flex flex-col items-center absolute" style={{ display: 'none' }} />
      )}
    </div>
  );
}

// ─── How it works step ────────────────────────────────────────────────────────
function FlowStep({ label, sub, last = false }: { label: string; sub?: string; last?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg bg-elevated/40 border border-border/40 hover:border-border/70 hover:bg-elevated/70 transition-all duration-200 group">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary/80 text-center group-hover:text-primary transition-colors duration-150">{label}</p>
          {sub && <p className="text-[10px] text-secondary/40 text-center font-mono mt-0.5">{sub}</p>}
        </div>
      </div>
      {!last && (
        <div className="flex flex-col items-center my-1">
          <div className="w-px h-4 bg-border/40 animate-connector" />
          <svg className="w-2 h-2 text-secondary/25 -mt-0.5" fill="currentColor" viewBox="0 0 8 8"><path d="M4 6L1 2h6L4 6z" /></svg>
        </div>
      )}
    </div>
  );
}

// ─── Architecture node ────────────────────────────────────────────────────────
function ArchNode({ icon, label, sub, highlight = false, last = false }: {
  icon: React.ReactNode; label: string; sub?: string; highlight?: boolean; last?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-200 hover:border-experiment/30 hover:bg-experiment/3 group w-full max-w-xs ${
        highlight ? 'border-experiment/25 bg-experiment/5' : 'border-border/50 bg-elevated/30'
      }`}>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
          highlight ? 'border-experiment/30 bg-experiment/10 text-experiment' : 'border-border/40 bg-elevated text-secondary/50 group-hover:text-experiment/60 group-hover:border-experiment/20'
        }`}>
          {icon}
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
            highlight ? 'text-experiment' : 'text-primary/80 group-hover:text-primary'
          }`}>{label}</p>
          {sub && <p className="text-[10px] text-secondary/40 font-mono mt-0.5">{sub}</p>}
        </div>
      </div>
      {!last && (
        <div className="flex flex-col items-center my-0.5">
          <div className="w-px h-5 bg-border/40 animate-connector" />
          <svg className="w-2 h-2 text-secondary/20 -mt-0.5" fill="currentColor" viewBox="0 0 8 8"><path d="M4 6L1 2h6L4 6z" /></svg>
        </div>
      )}
    </div>
  );
}

// ─── Capability item ──────────────────────────────────────────────────────────
function CapabilityItem({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0">
      <span className="w-4 h-4 rounded-full bg-pass/15 border border-pass/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-2.5 h-2.5 text-pass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-primary">{label}</p>
        <p className="text-xs text-secondary/55 mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

function ScopeItem({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0">
      <span className="w-4 h-4 rounded-full bg-elevated border border-border/50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="w-1 h-1 rounded-full bg-secondary/30" />
      </span>
      <div>
        <p className="text-sm font-medium text-secondary/70">{label}</p>
        <p className="text-xs text-secondary/40 mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useScrollReveal();

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="w-full">

      {/* ════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative border-b border-border/40 overflow-hidden">
        {/* Extra radial glow for hero only */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% -10%, rgba(110,156,203,0.07) 0%, transparent 65%)',
        }} />

        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left — identity + copy */}
            <div className="animate-slide-up">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-experiment/8 border border-experiment/20 rounded-full px-3 py-1 mb-7">
                <LogoMark size={13} className="text-experiment" />
                <span className="text-[10px] font-mono text-experiment/80 uppercase tracking-[0.2em]">Execution-based environment causality debugger</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight leading-[1.05] mb-5">
                ColdProof
              </h1>
              <p className="text-base text-secondary leading-relaxed mb-3">
                Don&apos;t just show me what&apos;s different.
              </p>
              <p className="text-lg font-semibold text-primary/90 leading-relaxed mb-8">
                Show me which difference <span className="text-experiment">changed the result.</span>
              </p>

              {/* Problem statement */}
              <p className="text-sm text-secondary/70 leading-relaxed mb-10 max-w-sm border-l border-border/50 pl-4">
                A command works on your machine but fails in CI, Docker, or a colleague&apos;s environment. ColdProof reproduces the behavior, finds environmental differences, tests each candidate, and produces structured evidence.
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/investigations/new"
                  className="group inline-flex items-center gap-2 bg-experiment hover:bg-experiment/90 text-[#0B0D0F] px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150 shadow-sm hover:shadow-experiment/20 hover:shadow-md active:scale-[0.97]">
                  <svg className="w-4 h-4 transition-transform duration-150 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  New Investigation
                </Link>
                <Link href="/investigations"
                  className="inline-flex items-center gap-1.5 text-sm text-secondary/70 hover:text-primary font-medium px-4 py-2.5 rounded-lg border border-border/50 hover:border-border/80 bg-elevated/30 hover:bg-elevated/60 transition-all duration-150">
                  View Investigations
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right — pipeline preview */}
            <div className="animate-slide-up flex flex-col items-center" style={{ animationDelay: '120ms' }}>
              <div className="w-full max-w-xs mx-auto bg-surface border border-border/50 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }} />
                <div className="relative space-y-0">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-pass/8 border border-pass/20">
                    <span className="text-pass font-bold text-xs tracking-widest">WARM</span>
                    <span className="text-pass/60 font-mono text-xs ml-auto">✓ PASS</span>
                  </div>
                  <div className="flex items-center justify-center py-0.5">
                    <div className="flex flex-col items-center"><div className="w-px h-3 bg-border/40 animate-connector" /><svg className="w-2 h-2 text-secondary/20 -mt-0.5" fill="currentColor" viewBox="0 0 8 8"><path d="M4 6L1 2h6L4 6z" /></svg></div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-fail/8 border border-fail/20">
                    <span className="text-fail font-bold text-xs tracking-widest">CLEAN</span>
                    <span className="text-fail/60 font-mono text-xs ml-auto">✗ FAIL</span>
                  </div>
                  <div className="flex items-center justify-center py-0.5">
                    <div className="flex flex-col items-center"><div className="w-px h-3 bg-border/40 animate-connector" /><svg className="w-2 h-2 text-secondary/20 -mt-0.5" fill="currentColor" viewBox="0 0 8 8"><path d="M4 6L1 2h6L4 6z" /></svg></div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-experiment/8 border border-experiment/20">
                    <span className="text-experiment font-bold text-xs tracking-widest">PERTURB</span>
                    <span className="text-experiment/60 font-mono text-xs ml-auto">BLOCK tsc</span>
                  </div>
                  <div className="flex items-center justify-center py-0.5">
                    <div className="flex flex-col items-center"><div className="w-px h-3 bg-border/40 animate-connector" /><svg className="w-2 h-2 text-secondary/20 -mt-0.5" fill="currentColor" viewBox="0 0 8 8"><path d="M4 6L1 2h6L4 6z" /></svg></div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-evidence/8 border border-evidence/20">
                    <span className="text-evidence font-bold text-xs tracking-widest">PROVE</span>
                    <span className="text-evidence/60 font-mono text-xs ml-auto">PARTIAL EVIDENCE</span>
                  </div>
                </div>
                <p className="text-[9px] text-secondary/25 font-mono uppercase tracking-[0.2em] text-center mt-5">example investigation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">

        {/* ════════════════════════════════════════════════════════
            PIPELINE — REPRODUCE → PERTURB → PROVE
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <SectionLabel step="01" title="Core methodology" />
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">Reproduce. Perturb. Prove.</h2>
            <p className="text-secondary/70 text-sm max-w-lg mx-auto leading-relaxed">
              Three deterministic steps that turn an environment failure into a structured, defensible conclusion.
            </p>
          </div>

          {/* Pipeline nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 relative">
            {/* Connector lines between nodes — desktop */}
            <div className="hidden sm:block absolute top-8 left-1/3 right-1/3 h-0.5 bg-border/30" style={{ top: '32px' }} />

            {[
              { label: 'REPRODUCE', description: 'Run the same command on the warm machine and in a clean Docker environment. Confirm behavioral divergence.', color: 'experiment' as const },
              { label: 'PERTURB', description: 'Isolate each environment candidate. Block or restore it and re-execute. One variable at a time.', color: 'evidence' as const },
              { label: 'PROVE', description: 'Compare perturbed results to the clean failure signature. Classify what the experiment actually supports.', color: 'pass' as const },
            ].map((stage, i) => (
              <PipelineStage key={stage.label} {...stage} index={i} total={3} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-xs font-mono text-secondary/35 tracking-[0.2em] uppercase">
              deterministic · no model inference · structured evidence classification
            </p>
          </div>
        </section>

        <div className="h-px bg-border/25 mb-1" />

        {/* ════════════════════════════════════════════════════════
            HOW IT WORKS — TECHNICAL FLOW
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <SectionLabel step="02" title="Technical flow" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">How ColdProof works</h2>
              <p className="text-secondary/70 text-sm leading-relaxed mb-6">
                From a failing command to a plain-English causal conclusion in one CLI invocation. No training data. No black-box model. Deterministic classification at every step.
              </p>
              <p className="text-xs font-mono text-secondary/40 tracking-widest uppercase">
                Run locally · Docker for isolation · Results uploaded automatically
              </p>
            </div>
            <div className="space-y-0">
              {[
                { label: 'CODE / COMMAND', sub: 'e.g. npm run build, npm test' },
                { label: 'Warm execution', sub: 'local machine · captures telemetry' },
                { label: 'Clean execution', sub: 'fresh Docker container · no local environment' },
                { label: 'Behavioral comparison', sub: 'exit codes · failure signatures' },
                { label: 'Candidate detection', sub: 'executables · runtimes · environment vars' },
                { label: 'Controlled perturbation', sub: 'block one candidate · re-execute' },
                { label: 'Evidence classification', sub: 'CONFIRMED / STRONG / PARTIAL / NOT_IMPLICATED' },
                { label: 'Result upload', sub: 'structured JSON → API → PostgreSQL' },
                { label: 'Plain-English explanation', sub: 'AI explains recorded evidence (optional)' },
              ].map((step, i, arr) => (
                <FlowStep key={step.label} label={step.label} sub={step.sub} last={i === arr.length - 1} />
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-border/25 mb-1" />

        {/* ════════════════════════════════════════════════════════
            ARCHITECTURE
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <SectionLabel step="03" title="Architecture" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">Actual architecture</h2>
              <p className="text-secondary/70 text-sm leading-relaxed mb-5">
                The engine runs on your machine. The web application stores and presents results. No data leaves your environment except structured investigation records.
              </p>
              <div className="bg-surface border border-experiment/15 rounded-xl p-4 text-xs text-secondary/60 leading-relaxed">
                <p className="text-experiment/70 font-mono font-bold uppercase tracking-widest text-[10px] mb-2">Note on AI</p>
                AI (Groq / Llama 3) is an <em className="text-primary/80 not-italic font-medium">optional explanation layer only</em>. The causal classification is fully deterministic. AI reads the stored evidence and explains it in plain English.
              </div>
            </div>

            <div className="flex flex-col items-center space-y-0">
              <ArchNode
                label="Developer machine"
                sub="warm execution environment"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21h8m-4-4v4" /></svg>}
              />
              <ArchNode
                label="ColdProof CLI"
                sub="npm install -g coldproof"
                highlight
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              />
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <ArchNode
                  label="Warm run"
                  sub="local · telemetry"
                  icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>}
                  last
                />
                <ArchNode
                  label="Docker run"
                  sub="clean environment"
                  icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}
                  last
                />
              </div>
              <div className="flex flex-col items-center my-0.5">
                <div className="w-px h-5 bg-border/40 animate-connector" />
                <svg className="w-2 h-2 text-secondary/20 -mt-0.5" fill="currentColor" viewBox="0 0 8 8"><path d="M4 6L1 2h6L4 6z" /></svg>
              </div>
              <ArchNode
                label="Candidate detection"
                sub="executables · runtimes · env"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35" /></svg>}
              />
              <ArchNode
                label="Perturbation engine"
                sub="block candidate · re-execute · classify"
                highlight
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              />
              <ArchNode
                label="API server"
                sub="Express · Firebase auth"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" /></svg>}
              />
              <ArchNode
                label="PostgreSQL"
                sub="investigations · candidates · evidence"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12M21 19c0 1.66-4.03 3-9 3S3 20.66 3 19" /><line x1="3" y1="5" x2="3" y2="19" strokeWidth="2" /><line x1="21" y1="5" x2="21" y2="19" strokeWidth="2" /></svg>}
              />
              <ArchNode
                label="Web dashboard"
                sub="Next.js · investigation detail · evidence"
                last
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-border/25 mb-1" />

        {/* ════════════════════════════════════════════════════════
            WHAT WE BUILT (MVP)
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <SectionLabel step="04" title="What we built" />
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">MVP capabilities</h2>
              <p className="text-secondary/70 text-sm leading-relaxed">
                Every capability listed below is fully implemented, tested against real projects, and available in the published npm package.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <code className="text-xs font-mono bg-[#08090A] border border-border/50 px-3 py-1.5 rounded text-primary/70">npm install -g coldproof</code>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { label: 'CLI investigation workflow', detail: 'Single command: coldproof investigate "npm run build"' },
                { label: 'Warm vs. clean execution', detail: 'Captures exit code and output from both environments' },
                { label: 'Docker-based clean environment', detail: 'Isolated Node.js container with no local env contamination' },
                { label: 'Environment candidate detection', detail: 'Detects executable path differences between environments' },
                { label: 'Project-local executable investigation', detail: 'Detects node_modules/.bin executables present locally but absent in Docker' },
                { label: 'Controlled perturbation', detail: 'Blocks each candidate via PATH manipulation · re-executes' },
                { label: 'Evidence classification', detail: 'CONFIRMED / STRONG_EVIDENCE / PARTIAL_EVIDENCE / NOT_IMPLICATED' },
                { label: 'Persisted investigations', detail: 'Structured results stored in PostgreSQL with ownership auth' },
                { label: 'Authenticated dashboard', detail: 'Firebase Auth · investigation archive · evidence detail view' },
                { label: 'Plain-English AI explanation', detail: 'Groq / Llama 3 explains recorded evidence on demand' },
                { label: 'npm-distributed CLI', detail: 'Published to npm · global install · coldproof --help' },
              ].map(item => <CapabilityItem key={item.label} {...item} />)}
            </div>
          </div>
        </section>

        <div className="h-px bg-border/25 mb-1" />

        {/* ════════════════════════════════════════════════════════
            NOT IN MVP
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <SectionLabel step="05" title="Intentional MVP scope" />
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">Not in this version</h2>
              <p className="text-secondary/70 text-sm leading-relaxed">
                These are known boundaries of the current system — not failures. ColdProof is scoped to proving the core technique with real projects.
              </p>
            </div>
            <div className="space-y-0">
              {[
                { label: 'Windows support', detail: 'Developed and tested on macOS/Linux. Windows compatibility is untested.' },
                { label: 'Full language-local binary detection', detail: 'Candidate detection currently covers the allowlisted executable set. Broader language-specific detection (Python venvs, Ruby gems, etc.) is not implemented.' },
                { label: 'Binary instrumentation beyond the allowlist', detail: 'The perturbation engine uses PATH blocking. Deeper binary-level interception is not in scope.' },
                { label: 'Multi-project workspace management', detail: 'One default project per user. Team/org project management is not implemented.' },
                { label: 'Automatic repair', detail: 'ColdProof identifies causal candidates but does not suggest or apply fixes.' },
                { label: 'CI/GitHub integration', detail: 'No native GitHub Actions or CI pipeline integration. Requires manual CLI invocation.' },
                { label: 'Runtime version perturbation', detail: 'Node.js and npm version differences are detected but perturbation of runtime versions is not yet implemented.' },
              ].map(item => <ScopeItem key={item.label} {...item} />)}
            </div>
          </div>
        </section>

        <div className="h-px bg-border/25 mb-1" />

        {/* ════════════════════════════════════════════════════════
            FEASIBILITY
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <SectionLabel step="06" title="Feasibility" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">Why this is practical</h2>
              <p className="text-secondary/70 text-sm leading-relaxed">
                The design is grounded in constraints that make it buildable, testable, and credible with real developer workflows.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                { title: 'Local execution', body: 'The engine runs where the developer is. No server-side sandbox infrastructure required.' },
                { title: 'Docker for isolation', body: 'Clean environments are standard Docker containers. No proprietary sandboxing.' },
                { title: 'No training dataset', body: 'Evidence classification is deterministic. No ML model to train, label, or maintain.' },
                { title: 'Deterministic causal engine', body: 'The classify step uses exit-code comparison and output fingerprinting. Reproducible and auditable.' },
                { title: 'AI is optional', body: 'Groq explains recorded evidence. If unavailable, investigation results are still complete.' },
                { title: 'Existing ecosystem', body: 'Node.js, npm, Docker, PostgreSQL, Firebase, Express. No exotic dependencies.' },
              ].map(({ title, body }) => (
                <div key={title} className="bg-surface border border-border/50 rounded-lg p-4 hover:border-border/80 transition-colors duration-200">
                  <p className="text-xs font-bold text-primary uppercase tracking-[0.12em] mb-1.5">{title}</p>
                  <p className="text-xs text-secondary/60 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-border/25 mb-1" />

        {/* ════════════════════════════════════════════════════════
            SCALABILITY
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <SectionLabel step="07" title="Scalability" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight mb-3">Realistic path forward</h2>
              <p className="text-secondary/70 text-sm leading-relaxed mb-6">
                The current architecture is designed for clean horizontal extension. Nothing in the MVP requires architectural replacement to scale.
              </p>
              {/* Scalability flow */}
              <div className="space-y-0">
                {[
                  'Local CLI execution',
                  'Structured result upload',
                  'Central investigation storage',
                  'Team · CI · project workflows',
                ].map((step, i, arr) => (
                  <div key={step} className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                        i < 2 ? 'bg-pass/15 border-pass/30 text-pass' : 'bg-elevated border-border/50 text-secondary/40'
                      }`}>
                        {i < 2 ? '✓' : '·'}
                      </span>
                      <span className={`text-sm font-medium ${i < 2 ? 'text-primary' : 'text-secondary/50'}`}>
                        {step}
                        {i < 2 && <span className="ml-2 text-[10px] font-mono text-pass/60 uppercase tracking-widest">implemented</span>}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="ml-2.5 w-px h-4 bg-border/30 my-0.5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <p className="text-[10px] font-mono text-secondary/35 uppercase tracking-[0.2em] mb-1">Potential expansion areas</p>
              {[
                { title: 'More candidate types', body: 'Environment variables, mounted volumes, installed system packages, container image differences.' },
                { title: 'Broader toolchain support', body: 'Python, Ruby, Go, Rust build tools alongside the current Node.js/npm focus.' },
                { title: 'CI integrations', body: 'GitHub Actions, GitLab CI triggers that automatically upload investigation results after a failed run.' },
                { title: 'Team workflows', body: 'Multi-user projects, investigation sharing, aggregated evidence across team environments.' },
                { title: 'Reproducibility contracts', body: 'Machine-readable environment specs derived from successful perturbation evidence.' },
              ].map(({ title, body }) => (
                <div key={title} className="bg-surface border border-border/40 rounded-lg p-4 hover:border-border/70 transition-colors duration-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary/30 flex-shrink-0" />
                    <p className="text-xs font-bold text-secondary/60 uppercase tracking-[0.1em]">{title}</p>
                    <span className="text-[9px] font-mono text-secondary/30 ml-auto">NOT YET</span>
                  </div>
                  <p className="text-xs text-secondary/45 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            FOOTER CTA
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-16 border-t border-border/25 reveal">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-5 rounded-full border border-experiment/25 bg-experiment/5 flex items-center justify-center">
              <LogoMark size={20} className="text-experiment/70" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2 tracking-tight">Ready to investigate?</h2>
            <p className="text-secondary/60 text-sm mb-7 max-w-xs mx-auto leading-relaxed">
              Run ColdProof against any command that behaves differently across environments.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/investigations/new"
                className="group inline-flex items-center gap-2 bg-experiment hover:bg-experiment/90 text-[#0B0D0F] px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150 shadow-sm hover:shadow-experiment/20 hover:shadow-md active:scale-[0.97]">
                <svg className="w-4 h-4 transition-transform duration-150 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                New Investigation
              </Link>
              <Link href="/investigations"
                className="inline-flex items-center gap-1.5 text-sm text-secondary/70 hover:text-primary font-medium px-4 py-2.5 rounded-lg border border-border/50 hover:border-border/80 transition-all duration-150">
                View Evidence Archive →
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
