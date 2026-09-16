'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function NewInvestigationPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [command, setCommand] = useState('npm test');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // To handle the waiting state:
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
            // Create a default project
            const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: 'Default Project' })
            });
            if (createRes.ok) {
              const newProject = await createRes.json();
              setProjectId(newProject.id);
            }
          }
        }
      } catch (err: any) {
        setProjectError('Failed to load or create project workspace.');
      }
    }
    
    if (user && !loading) {
      setupProject();
    }
  }, [user, loading, getToken]);
  
  // Polling for new investigations
  useEffect(() => {
    if (!waiting || !projectId || !token) return;
    
    let interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/investigations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Check if there is an investigation that matches the project ID and is very recent
          const recent = data.find((inv: any) => 
            inv.projectId === projectId && 
            (Date.now() - new Date(inv.createdAt).getTime() < 30000)
          );
          if (recent) {
            clearInterval(interval);
            router.push(`/investigations/${recent.id}`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [waiting, projectId, token, router]);

  const cliCommand = `export COLDPROOF_API_URL="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}"\nexport COLDPROOF_TOKEN="${token}"\nexport COLDPROOF_PROJECT_ID="${projectId}"\nnpx coldproof investigate "${command.replace(/"/g, '\\"')}"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setWaiting(true);
  };

  if (loading || !user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto w-full flex-grow flex flex-col">
      <h1 className="text-3xl font-bold text-primary mb-3">New Investigation</h1>
      <p className="text-secondary mb-8 text-lg">
        Find which environment difference is actually causing your local or CI failure.
      </p>

      <div className="bg-experiment/10 border border-experiment/20 rounded-lg p-5 mb-8 flex items-start space-x-4 shadow-sm">
        <svg className="w-6 h-6 text-experiment flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-semibold text-primary mb-1">How ColdProof Works</h3>
          <p className="text-secondary text-sm leading-relaxed">
            For security and technical accuracy, the browser does <span className="font-semibold text-primary">not</span> execute your command. 
            ColdProof runs strictly locally on your machine via the CLI, isolating your environment in a Docker container to prove causality.
          </p>
        </div>
      </div>

      {projectError && <div className="bg-fail/20 text-fail p-4 rounded mb-6">{projectError}</div>}

      <div className="bg-surface border border-border p-6 rounded-lg mb-8 shadow-sm">
        <h2 className="text-xl font-semibold text-primary mb-4">1. Enter the failing command</h2>
        <p className="text-secondary text-sm mb-4">
          What command do you normally run?
        </p>
        <div className="mb-4">
          <input 
            type="text" 
            className="w-full bg-background border border-border rounded p-3 text-primary font-mono focus:outline-none focus:border-experiment"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="npm test"
          />
        </div>
        <p className="text-secondary text-sm">
          Run this from your project's root directory.
        </p>
      </div>

      <div className="bg-surface border border-border p-6 rounded-lg mb-8 shadow-sm">
        <h2 className="text-xl font-semibold text-primary mb-4">2. Run ColdProof locally</h2>
        <p className="text-secondary text-sm mb-5 leading-relaxed">
          Copy this command and run it in your terminal from your project's root.<br />
          This will securely trigger the local daemon using your credentials.
        </p>
        
        {projectId && token ? (
          <div className="relative group">
            <pre className="bg-[#08090A] border border-border/50 p-5 rounded-lg font-mono text-sm text-primary overflow-x-auto whitespace-pre-wrap pr-20 shadow-inner">
              <span className="text-secondary select-none">$ </span>npx coldproof investigate "{command.replace(/"/g, '\\"')}"
            </pre>
            <button 
              onClick={copyToClipboard}
              className="absolute top-2 right-2 bg-surface hover:bg-elevated border border-border text-primary px-3 py-1 rounded text-xs transition-colors flex items-center space-x-1"
              title="Copies the full command with authentication exports"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3 text-pass" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-pass">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-background border border-border p-4 rounded text-secondary text-sm">
            Setting up your workspace context...
          </div>
        )}

        <div className="mt-6">
          <p className="text-secondary text-sm font-medium">Then:</p>
          <p className="text-primary text-sm mt-2 font-mono">Warm &rarr; Clean &rarr; Compare &rarr; Perturb &rarr; Prove</p>
        </div>
      </div>

      {waiting && (
        <div className="bg-surface border border-border p-8 rounded-lg flex flex-col items-center justify-center animate-pulse">
          <div className="w-12 h-12 border-4 border-experiment/30 border-t-experiment rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-semibold text-primary">Awaiting Telemetry...</h3>
          <p className="text-secondary text-sm max-w-sm text-center mt-2">
            Run the copied command in your terminal. We are listening for the causal proof results from your local ColdProof daemon.
          </p>
        </div>
      )}
    </div>
  );
}
