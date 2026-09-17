'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { firebaseSignOut } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 1.5" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

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
    <nav className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface/95 backdrop-blur-sm shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-7">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-experiment transition-transform duration-150 group-hover:scale-110">
            <LogoMark size={18} />
          </span>
          <span className="font-bold text-sm tracking-wide text-primary">ColdProof</span>
        </Link>

        {user && (
          <Link
            href="/"
            className={`text-xs font-medium uppercase tracking-widest transition-colors ${
              isInvestigations
                ? 'text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {isInvestigations && (
              <span className="inline-block border-b border-experiment/60 pb-px">Investigations</span>
            )}
            {!isInvestigations && 'Investigations'}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-secondary text-xs hidden sm:block truncate max-w-[180px] font-mono opacity-60">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-secondary hover:text-primary transition-colors font-medium px-2.5 py-1 rounded-md hover:bg-elevated"
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
