'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { firebaseSignOut } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const isInvestigations = pathname === '/' || pathname.startsWith('/investigations');

  return (
    <nav className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface/95 backdrop-blur-sm shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-7">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-5 h-5 rounded flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-experiment" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L2 7v6l8 5 8-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 2v11M2 7l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-sm tracking-wide text-primary">ColdProof</span>
        </Link>

        {user && (
          <Link
            href="/"
            className={`text-xs font-medium uppercase tracking-widest transition-colors ${
              isInvestigations
                ? 'text-primary border-b border-experiment/60 pb-px'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Investigations
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-secondary text-xs hidden sm:block truncate max-w-[180px] font-mono">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-secondary hover:text-primary transition-colors font-medium"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs font-medium text-secondary hover:text-primary transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
