'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function useScrollReveal(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('revealed'); obs.unobserve(e.target); } }),
      { threshold: 0.06 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [ready]);
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

// ─── Phase label ──────────────────────────────────────────────────────────────
function PhaseLabel({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-10">
      <span className="text-[10px] font-mono text-experiment/40 tracking-[0.2em] uppercase select-none border border-experiment/15 rounded px-2 py-0.5 bg-experiment/[0.03]">{step}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
      <span className="text-[10px] font-mono text-secondary/30 tracking-[0.2em] uppercase select-none">{title}</span>
    </div>
  );
}

// ─── Hero diagnostic pipeline ─────────────────────────────────────────────────
function HeroPipeline() {
  const stages = [
    { key: 'warm', label: 'WARM', status: '✓ PASS', statusColor: 'text-pass', borderColor: 'border-pass/30', bgColor: 'bg-pass/[0.04]', dotColor: 'bg-pass' },
    { key: 'clean', label: 'CLEAN', status: '✗ FAIL', statusColor: 'text-fail', borderColor: 'border-fail/30', bgColor: 'bg-fail/[0.04]', dotColor: 'bg-fail' },
    { key: 'diff', label: 'DIFF', status: '3 CANDIDATES', statusColor: 'text-secondary/60', borderColor: 'border-border/50', bgColor: 'bg-elevated/30', dotColor: 'bg-secondary/40' },
    { key: 'perturb', label: 'PERTURB', status: 'BLOCK CANDIDATE', statusColor: 'text-experiment', borderColor: 'border-experiment/30', bgColor: 'bg-experiment/[0.04]', dotColor: 'bg-experiment' },
    { key: 'evidence', label: 'EVIDENCE', status: 'CONFIRMED', statusColor: 'text-pass', borderColor: 'border-pass/30', bgColor: 'bg-pass/[0.04]', dotColor: 'bg-pass' },
  ];

  return (
    <div className="w-full">
      {/* Desktop — horizontal */}
      <div className="hidden md:flex items-stretch justify-between gap-0 relative">
        {/* Connector line behind everything */}
        <div className="absolute top-[23px] left-[40px] right-[40px] h-px bg-border/40" />
        <div className="absolute top-[23px] left-[40px] right-[40px] h-px bg-gradient-to-r from-pass/20 via-experiment/20 to-pass/20 opacity-60" />

        {stages.map((stage, i) => (
          <div key={stage.key} className="flex flex-col items-center relative z-[1] flex-1 pipeline-node-animate" style={{ animationDelay: `${800 + i * 150}ms` }}>
            {/* Node */}
            <div className={`w-[46px] h-[46px] rounded-full border ${stage.borderColor} ${stage.bgColor} flex items-center justify-center mb-3 transition-all duration-300 hover:scale-110`}>
              <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
            </div>
            {/* Label */}
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${stage.statusColor}`}>{stage.label}</p>
            {/* Status */}
            <p className={`text-[9px] font-mono ${stage.statusColor} opacity-70`}>{stage.status}</p>
          </div>
        ))}
      </div>

      {/* Mobile — vertical */}
      <div className="flex md:hidden flex-col items-center gap-0">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.key}>
            <div className={`flex items-center gap-4 w-full max-w-[260px] px-4 py-2.5 rounded-lg border ${stage.borderColor} ${stage.bgColor}`}>
              <div className={`w-2 h-2 rounded-full ${stage.dotColor} flex-shrink-0`} />
              <span className={`text-xs font-bold uppercase tracking-[0.14em] ${stage.statusColor} flex-1`}>{stage.label}</span>
              <span className={`text-[10px] font-mono ${stage.statusColor} opacity-70`}>{stage.status}</span>
            </div>
            {i < stages.length - 1 && (
              <div className="flex flex-col items-center my-0.5">
                <div className="w-px h-3 bg-border/40" />
                <svg className="w-2 h-2 text-secondary/20 -mt-0.5" fill="currentColor" viewBox="0 0 8 8"><path d="M4 6L1 2h6L4 6z" /></svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Label */}
      <p className="text-[9px] font-mono text-secondary/20 uppercase tracking-[0.25em] text-center mt-5 select-none">
        example diagnostic trace
      </p>
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
function ArchNode({ icon, label, sub, highlight = false, last = false, details }: {
  icon: React.ReactNode; label: string; sub?: string; highlight?: boolean; last?: boolean; details?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center w-full">
      <button 
        onClick={() => setOpen(!open)}
        className={`flex flex-col text-left transition-all duration-300 w-full max-w-xs hover-card-elevate rounded-xl border ${
        highlight ? 'border-experiment/25 bg-experiment/5 hover-glow-experiment' : 'border-border/50 bg-elevated/30 hover:border-experiment/30 hover:bg-experiment/5'
      }`}>
        <div className="flex items-center gap-3 px-5 py-3 w-full group">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
            highlight ? 'border-experiment/30 bg-experiment/10 text-experiment' : 'border-border/40 bg-elevated text-secondary/50 group-hover:text-experiment/60 group-hover:border-experiment/20'
          }`}>
            {icon}
          </div>
          <div className="flex-1">
            <p className={`text-xs font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
              highlight ? 'text-experiment' : 'text-primary/80 group-hover:text-primary'
            }`}>{label}</p>
            {sub && <p className="text-[10px] text-secondary/40 font-mono mt-0.5">{sub}</p>}
          </div>
          {details && (
             <svg className={`w-3.5 h-3.5 text-secondary/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
             </svg>
          )}
        </div>
        {details && (
          <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-5 pb-4 pt-1 text-xs text-secondary/60 leading-relaxed border-t border-border/10 mx-2">
              {details}
            </div>
          </div>
        )}
      </button>
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
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} className="w-full text-left flex flex-col py-2.5 border-b border-border/20 last:border-0 group transition-colors hover:bg-elevated/20 px-2 -mx-2 rounded-lg">
      <div className="flex items-start gap-3 w-full">
        <span className="w-4 h-4 rounded-full bg-pass/15 border border-pass/30 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors group-hover:bg-pass/25">
          <svg className="w-2.5 h-2.5 text-pass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary transition-colors group-hover:text-primary/90">{label}</p>
        </div>
        <svg className={`w-4 h-4 text-secondary/30 mt-0.5 transition-transform duration-200 group-hover:text-secondary/60 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ml-7 ${open ? 'max-h-32 opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'}`}>
         <p className="text-xs text-secondary/65 leading-relaxed">{detail}</p>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const ready = !loading;
  useScrollReveal(ready);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-experiment/30 border-t-experiment rounded-full animate-spin" />
          <span className="text-secondary/40 text-xs font-mono uppercase tracking-widest">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full scan-line">

      {/* ════════════════════════════════════════════════════════
          HERO — Cinematic single-column composition
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative border-b border-border/30 overflow-hidden">
        {/* Layered background effects */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(110,156,203,0.07) 0%, transparent 75%), linear-gradient(to bottom, transparent 60%, var(--color-background) 100%)',
        }} />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-24 relative">
          {/* Logo + Identity */}
          <div className="flex items-center gap-3 mb-10 animate-slide-up" style={{ animationDelay: '0ms' }}>
            <div className="relative group cursor-default inline-flex">
              <div className="absolute inset-0 rounded-full bg-experiment/10 blur-xl scale-[2.5] opacity-30 group-hover:opacity-60 transition-opacity duration-1000" />
              <div className="relative text-experiment animate-hero-logo">
                <LogoMark size={36} />
              </div>
            </div>
            <span className="text-[10px] font-mono text-experiment/40 tracking-[0.2em] uppercase border border-experiment/15 rounded px-2.5 py-0.5 bg-experiment/[0.03]">
              Environment causality debugger
            </span>
          </div>

          {/* Editorial headline */}
          <h1 className="text-[2.75rem] md:text-[3.5rem] font-bold text-primary tracking-[-0.035em] leading-[1.05] mb-6 max-w-3xl text-balance animate-slide-up" style={{ animationDelay: '80ms' }}>
            Don&rsquo;t just show what&rsquo;s different.<br />
            <span className="text-experiment">Prove which difference changed the result.</span>
          </h1>

          {/* Supporting copy */}
          <p className="text-base md:text-lg text-secondary/70 leading-relaxed max-w-xl mb-5 animate-slide-up" style={{ animationDelay: '160ms' }}>
            ColdProof compares how the same command behaves in your environment and a clean environment, then experimentally perturbs candidates to determine which differences actually affect the result.
          </p>

          <p className="text-xs font-mono text-secondary/30 tracking-[0.2em] uppercase mb-10 animate-slide-up" style={{ animationDelay: '240ms' }}>
            deterministic · no model inference · structured evidence classification
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap mb-16 md:mb-20 animate-slide-up" style={{ animationDelay: '320ms' }}>
            <Link href="/demo/investigations"
              className="group inline-flex items-center gap-2 bg-experiment hover:bg-experiment/90 text-[#0B0D0F] px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 shadow-[0_0_0_rgba(110,156,203,0)] hover:shadow-[0_4px_20px_-4px_rgba(110,156,203,0.4)] hover:-translate-y-0.5 active:translate-y-0">
              Explore Demo Investigations
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href={user ? "/investigations/new" : "/login"}
              className="group inline-flex items-center gap-1.5 text-sm text-secondary/60 hover:text-primary font-medium px-4 py-2.5 rounded-lg border border-border/50 hover:border-experiment/30 bg-elevated/30 hover:bg-experiment/5 transition-all duration-300">
              New Investigation
            </Link>
            <Link href={user ? "/investigations" : "/login"}
              className="group inline-flex items-center gap-1.5 text-sm text-secondary/60 hover:text-primary font-medium px-4 py-2.5 rounded-lg border border-border/50 hover:border-experiment/30 bg-elevated/30 hover:bg-experiment/5 transition-all duration-300">
              View Investigations
            </Link>
          </div>

          {/* Full-width diagnostic pipeline */}
          <div className="animate-slide-up" style={{ animationDelay: '480ms' }}>
            <HeroPipeline />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">

        {/* ════════════════════════════════════════════════════════
            PHASE 01 — REPRODUCE → PERTURB → PROVE
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <PhaseLabel step="01" title="Core methodology" />
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-primary tracking-[-0.02em] mb-3 text-balance">Reproduce. Perturb. Prove.</h2>
            <p className="text-secondary/60 text-sm max-w-lg mx-auto leading-relaxed">
              Three deterministic steps that turn an environment failure into a structured, defensible conclusion.
            </p>
          </div>

          {/* Three-stage breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              {
                label: 'REPRODUCE',
                description: 'Run the same command on the warm machine and in a clean Docker environment. Confirm behavioral divergence.',
                color: 'experiment' as const,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
              },
              {
                label: 'PERTURB',
                description: 'Isolate each environment candidate. Block or restore it and re-execute. One variable at a time.',
                color: 'evidence' as const,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                label: 'PROVE',
                description: 'Compare perturbed results to the clean failure signature. Classify what the experiment actually supports.',
                color: 'pass' as const,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((stage) => {
              const colorMap = {
                experiment: { border: 'border-experiment/20 hover:border-experiment/40', text: 'text-experiment', bg: 'bg-experiment/[0.04]', iconBg: 'bg-experiment/10 border-experiment/25' },
                evidence: { border: 'border-evidence/20 hover:border-evidence/40', text: 'text-evidence', bg: 'bg-evidence/[0.04]', iconBg: 'bg-evidence/10 border-evidence/25' },
                pass: { border: 'border-pass/20 hover:border-pass/40', text: 'text-pass', bg: 'bg-pass/[0.04]', iconBg: 'bg-pass/10 border-pass/25' },
              }[stage.color];
              return (
                <div key={stage.label} className={`border rounded-xl p-6 ${colorMap.border} ${colorMap.bg} transition-all duration-300 hover:-translate-y-0.5`}>
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 ${colorMap.iconBg} ${colorMap.text}`}>
                    {stage.icon}
                  </div>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] mb-3 ${colorMap.text}`}>{stage.label}</p>
                  <p className="text-sm text-secondary/60 leading-relaxed">{stage.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            PHASE 02 — TECHNICAL FLOW
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <PhaseLabel step="02" title="Technical flow" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-[-0.02em] mb-3">How ColdProof works</h2>
              <p className="text-secondary/60 text-sm leading-relaxed mb-6">
                From a failing command to a plain-English causal conclusion in one CLI invocation. No training data. No black-box model. Deterministic classification at every step.
              </p>
              <p className="text-[10px] font-mono text-secondary/30 tracking-[0.2em] uppercase">
                Run locally · Docker for isolation · Results uploaded automatically
              </p>
            </div>
            <div className="space-y-0">
              {[
                { label: 'CODE / COMMAND', sub: 'e.g. your build or test command' },
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

        {/* ════════════════════════════════════════════════════════
            PHASE 03 — ARCHITECTURE
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <PhaseLabel step="03" title="Architecture" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-[-0.02em] mb-3">Actual architecture</h2>
              <p className="text-secondary/60 text-sm leading-relaxed mb-5">
                The engine runs on your machine. The web application stores and presents results. No data leaves your environment except structured investigation records.
              </p>
              <div className="bg-surface border border-experiment/15 rounded-xl p-4 text-xs text-secondary/60 leading-relaxed">
                <p className="text-experiment/70 font-mono font-bold uppercase tracking-widest text-[10px] mb-2">Note on AI</p>
                AI (Groq / Llama 3) is an <em className="text-primary/80 not-italic font-medium">optional explanation layer only</em>. The causal classification is fully deterministic. AI reads the stored evidence and explains it in plain English.
              </div>
            </div>

            <div className="flex flex-col items-center space-y-0 w-full">
              <ArchNode
                label="Developer machine"
                sub="warm execution environment"
                details="Runs locally using the user's default toolchain. Captures baseline exit codes and output to compare against the clean environment."
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21h8m-4-4v4" /></svg>}
              />
              <ArchNode
                label="ColdProof CLI"
                sub="npm install -g coldproof@0.1.7"
                highlight
                details="The core investigation engine. Orchestrates the WARM run, Docker build/run, candidate extraction, and subsequent PERTURB cycles."
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
                details="Compares `which` paths, `npm list`, and `env` vars between the WARM and CLEAN runs to isolate environmental differences."
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35" /></svg>}
              />
              <ArchNode
                label="Perturbation engine"
                sub="block candidate · re-execute · classify"
                highlight
                details="Systematically injects shims into PATH to block or manipulate specific candidates, then re-runs the command to observe behavioral changes."
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              />
              <ArchNode
                label="API server"
                sub="Express · Firebase auth"
                details="Receives the structured JSON investigation reports generated by the CLI, authenticates the request, and persists it to the database."
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" /></svg>}
              />
              <ArchNode
                label="PostgreSQL"
                sub="investigations · candidates · evidence"
                details="Uses Prisma ORM for relational storage of investigations, candidate states, output logs, and classification evidence."
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12M21 19c0 1.66-4.03 3-9 3S3 20.66 3 19" /><line x1="3" y1="5" x2="3" y2="19" strokeWidth="2" /><line x1="21" y1="5" x2="21" y2="19" strokeWidth="2" /></svg>}
              />
              <ArchNode
                label="Web dashboard"
                sub="Next.js · investigation detail · evidence"
                last
                details="This UI. Fetches the stored investigation records, translates the structured evidence into human-readable views, and connects to Groq AI for plain-English summaries."
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            PHASE 04 — MVP CAPABILITIES
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <PhaseLabel step="04" title="What we built" />
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-[-0.02em] mb-3">MVP capabilities</h2>
              <p className="text-secondary/60 text-sm leading-relaxed mb-4">
                Every capability listed below is fully implemented, tested against real projects, and available in the published npm package.
              </p>
              <code className="text-xs font-mono bg-[#08090A] border border-border/50 px-3 py-1.5 rounded text-primary/70 inline-block">npm install -g coldproof@0.1.7</code>
            </div>
            <div className="space-y-0">
              {[
                { label: 'CLI investigation workflow', detail: 'Single command: coldproof investigate "npm run build"' },
                { label: 'Warm vs. clean execution', detail: 'Captures exit code and output from both environments' },
                { label: 'Docker-based clean environment', detail: 'Isolated Node.js container with no local env contamination' },
                { label: 'Environment candidate detection', detail: 'Detects executable path differences between environments' },
                { label: 'Project-local executable investigation', detail: 'Detects project-specific executables present locally but absent in Docker' },
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

        {/* ════════════════════════════════════════════════════════
            PHASE 05 — FEASIBILITY + ENVIRONMENTS
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <PhaseLabel step="05" title="Feasibility & environments" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-[-0.02em] mb-3">Why this is practical</h2>
              <p className="text-secondary/60 text-sm leading-relaxed mb-6">
                The design is grounded in constraints that make it buildable, testable, and credible with real developer workflows.
              </p>

              {/* Supported environments */}
              <div className="bg-surface border border-border/40 rounded-xl p-5 mt-4">
                <p className="text-[10px] font-mono text-experiment/50 uppercase tracking-[0.2em] mb-3">Supported environments</p>
                <div className="space-y-2.5">
                  {[
                    'macOS, Linux & Windows',
                    'Docker Clean Environments',
                    'Command-Line Workflows',
                  ].map(env => (
                    <div key={env} className="flex items-center gap-2.5 text-sm text-secondary/70">
                      <span className="w-1 h-1 rounded-full bg-experiment/50 flex-shrink-0" />
                      {env}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { label: 'Local execution', detail: 'The engine runs where the developer is. No server-side sandbox infrastructure required.' },
                { label: 'Docker for clean isolation', detail: 'Clean environments are standard Docker containers. No proprietary sandboxing required.' },
                { label: 'No training dataset required', detail: 'Evidence classification is deterministic. No ML model to train, label, or maintain.' },
                { label: 'Deterministic causal engine', detail: 'The classify step uses exit-code comparison and output fingerprinting. Fully reproducible and auditable.' },
                { label: 'AI is an optional layer', detail: 'Groq/Llama 3 explains the recorded evidence. If AI is unavailable, investigation results are still complete and accurate.' },
                { label: 'Existing ecosystem only', detail: 'Node.js, npm, Docker, PostgreSQL, Firebase, Express. No exotic dependencies or proprietary infrastructure.' },
              ].map(item => <CapabilityItem key={item.label} {...item} />)}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            PHASE 06 — SCALABILITY
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 reveal">
          <PhaseLabel step="06" title="Scalability" />
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-[-0.02em] mb-3">Realistic path forward</h2>
              <p className="text-secondary/60 text-sm leading-relaxed mb-6">
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
              <p className="text-[10px] font-mono text-secondary/30 uppercase tracking-[0.2em] mb-1">Potential expansion areas</p>
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
                    <span className="text-[9px] font-mono text-secondary/25 ml-auto">NOT YET</span>
                  </div>
                  <p className="text-xs text-secondary/45 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            FOOTER CTA — Terminal-style
        ═══════════════════════════════════════════════════════════ */}
        <section className="py-16 border-t border-border/20 reveal">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-10 h-10 mx-auto mb-5 rounded-full border border-experiment/20 bg-experiment/[0.04] flex items-center justify-center">
              <LogoMark size={18} className="text-experiment/70" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2 tracking-[-0.02em]">Ready to investigate?</h2>
            <p className="text-secondary/50 text-sm mb-4 leading-relaxed">
              Run ColdProof against any command that behaves differently across environments.
            </p>

            {/* Terminal-style install block */}
            <div className="bg-[#08090A] border border-border/50 rounded-lg px-4 py-3 font-mono text-sm text-primary/70 mb-7 text-left inline-flex items-center gap-2 mx-auto">
              <span className="text-secondary/30 select-none">$</span>
              <span>npm install -g coldproof@0.1.7</span>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href={user ? "/investigations/new" : "/login"}
                className="group inline-flex items-center gap-2 bg-experiment hover:bg-experiment/90 text-[#0B0D0F] px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 shadow-[0_0_0_rgba(110,156,203,0)] hover:shadow-[0_4px_20px_-4px_rgba(110,156,203,0.4)] hover:-translate-y-0.5 active:translate-y-0">
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                New Investigation
              </Link>
              <Link href={user ? "/investigations" : "/login"}
                className="group inline-flex items-center gap-1.5 text-sm text-secondary/60 hover:text-primary font-medium px-4 py-2.5 rounded-lg border border-border/50 hover:border-experiment/30 bg-elevated/30 hover:bg-experiment/5 transition-all duration-300">
                View Evidence Archive
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
