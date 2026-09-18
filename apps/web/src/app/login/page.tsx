'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, googleProvider } from '@/lib/firebase';
import { auth } from '@/lib/firebase';

// ─── ColdProof logo mark ───────────────────────────────────────────
function LogoMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hexagon frame */}
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {/* Vertical causality line */}
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 1.5" />
      {/* Horizontal comparison line */}
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.25" />
      {/* Center dot — the proof point */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

// ─── Experiment flow visual ────────────────────────────────────────
function ExperimentFlow() {
  const steps = [
    { label: 'WARM', sub: 'PASS', color: 'text-pass', bg: 'bg-pass/10 border-pass/25' },
    { label: 'CLEAN', sub: 'FAIL', color: 'text-fail', bg: 'bg-fail/10 border-fail/25' },
    { label: 'PERTURB', sub: 'BLOCK', color: 'text-experiment', bg: 'bg-experiment/10 border-experiment/25' },
    { label: 'PROVE', sub: 'EVIDENCE', color: 'text-evidence', bg: 'bg-evidence/10 border-evidence/25' },
  ];

  return (
    <div className="relative flex flex-col items-center gap-0 select-none pointer-events-none">
      {/* Subtle radial glow behind flow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 120px 200px at 50% 50%, rgba(110,156,203,0.06) 0%, transparent 70%)',
        }}
      />
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div
            className={`flex flex-col items-center px-4 py-2.5 rounded-lg border ${step.bg} w-28 transition-all duration-200 hover:scale-[1.02]`}
          >
            <span className={`text-xs font-bold uppercase tracking-widest ${step.color}`}>
              {step.label}
            </span>
            <span className={`text-xs font-mono mt-0.5 ${step.color} opacity-70`}>
              {step.sub}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex flex-col items-center my-0.5">
              <div className="w-px h-3 bg-border/40 animate-connector" />
              <svg className="w-2.5 h-2.5 text-secondary/25 -mt-0.5 animate-connector" fill="currentColor" viewBox="0 0 10 10">
                <path d="M5 8L1 3h8L5 8z" />
              </svg>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-stretch min-h-0 overflow-hidden bg-background">
      {/* ── Left panel: branding + product visual ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-border px-12 py-14 relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(var(--color-border) 1px, transparent 1px),
              linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />
        {/* Subtle radial fade over grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/70 pointer-events-none" />

        {/* Wordmark */}
        <div
          className="relative flex items-center gap-2.5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(-6px)',
            transition: 'opacity 300ms ease, transform 300ms ease',
          }}
        >
          <LogoMark size={22} className="text-experiment" />
          <span className="font-bold text-base tracking-wide text-primary">ColdProof</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-5">
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(12px)',
              transition: 'opacity 400ms 100ms ease, transform 400ms 100ms ease',
            }}
          >
            <p className="text-xs font-mono text-secondary/60 uppercase tracking-[0.2em] mb-3">
              Environment causality debugger
            </p>
            <h2 className="text-3xl font-bold text-primary leading-tight tracking-tight">
              Prove what<br />changed.
            </h2>
          </div>

          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(10px)',
              transition: 'opacity 400ms 220ms ease, transform 400ms 220ms ease',
            }}
          >
            <p className="text-sm text-secondary leading-relaxed">
              Don&apos;t just show me what&apos;s different.<br />
              Show me which difference <em className="text-primary not-italic font-medium">changed the result.</em>
            </p>
          </div>

          {/* Product experiment visual */}
          <div
            className="pt-4"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 500ms 380ms ease',
            }}
          >
            <ExperimentFlow />
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          className="relative"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 400ms 500ms ease',
          }}
        >
          <p className="text-xs text-secondary/40 font-mono">
            REPRODUCE · PERTURB · PROVE
          </p>
        </div>
      </div>

      {/* ── Right panel: sign-in card ── */}
      <div className="flex-grow flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(14px)',
            transition: 'opacity 400ms 120ms ease, transform 400ms 120ms ease',
          }}
        >
          {/* Mobile wordmark — only visible when left panel is hidden */}
          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <LogoMark size={20} className="text-experiment" />
            <span className="font-bold text-sm tracking-wide text-primary">ColdProof</span>
          </div>

          {/* Card */}
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl shadow-black/40">
            {/* Card header */}
            <div className="mb-7">
              {/* Show logo on desktop inside card too, since left panel has the branding */}
              <div className="flex items-center gap-2 mb-5 lg:hidden">
                <LogoMark size={18} className="text-experiment" />
                <span className="font-semibold text-sm text-primary">ColdProof</span>
              </div>
              <h1 className="text-xl font-bold text-primary tracking-tight">Sign in</h1>
              <p className="text-secondary text-sm mt-1 leading-relaxed">
                Experimental debugging for environment-dependent failures.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-fail/8 border border-fail/25 text-fail p-3 rounded-lg mb-5 text-xs font-medium flex items-start gap-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {error}
              </div>
            )}

            {/* Google sign-in — primary */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 active:bg-primary/80 text-background font-semibold text-sm py-3 px-4 rounded-xl transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-experiment/50 focus:ring-offset-2 focus:ring-offset-surface"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-border flex-grow" />
              <span className="text-secondary/50 text-xs font-medium">or</span>
              <div className="h-px bg-border flex-grow" />
            </div>

            {/* Email toggle */}
            {!showEmail ? (
              <button
                onClick={() => setShowEmail(true)}
                className="w-full text-secondary hover:text-primary text-sm font-medium py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-experiment/50 rounded-lg"
              >
                Sign in with email
              </button>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
                  <input
                    type="email"
                    autoFocus
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-experiment/50 focus:shadow-[0_0_0_2px_rgba(110,156,203,0.08)] transition-all duration-150 placeholder:text-secondary/40"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Password</label>
                  <input
                    type="password"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-experiment/50 focus:shadow-[0_0_0_2px_rgba(110,156,203,0.08)] transition-all duration-150 placeholder:text-secondary/40"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-experiment hover:bg-experiment/90 active:bg-experiment/80 text-[#0B0D0F] font-semibold text-sm py-2.5 rounded-xl transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <span className="w-3.5 h-3.5 border-2 border-[#0B0D0F]/30 border-t-[#0B0D0F] rounded-full animate-spin" />}
                  Sign in
                </button>
              </form>
            )}

            {/* Footer note */}
            <p className="text-xs text-secondary/40 text-center mt-6 leading-relaxed">
              Your credentials are handled by Firebase Auth.<br />
              ColdProof stores investigation results only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
