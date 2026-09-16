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

  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-surface shrink-0">
      <div className="flex items-center space-x-6 sm:space-x-8">
        <Link href="/" className="font-bold text-lg tracking-wide text-primary flex-shrink-0">
          ColdProof
        </Link>
        
        {user && (
          <div className="flex items-center">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${
                pathname === '/' || pathname.startsWith('/investigations')
                  ? 'text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Investigations
            </Link>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4 sm:space-x-6">
        {user ? (
          <>
            <span className="text-secondary text-sm hidden sm:inline-block truncate max-w-[200px]">
              {user.email}
            </span>
            <button 
              onClick={handleLogout}
              className="text-sm text-secondary hover:text-primary transition-colors flex-shrink-0 font-medium"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login" className="text-sm font-medium text-secondary hover:text-primary transition-colors">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
