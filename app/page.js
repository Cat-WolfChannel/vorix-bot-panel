'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="container">
      <div className="hero">
        <h1 className="logo-title">VØRIX Bot Panel</h1>
        <p>
          Steuere deinen Discord-Bot: Server auswählen, Kanäle und Rollen
          einstellen – alles an einem Ort.
        </p>
        {status === 'loading' ? (
          <p className="muted">Laden...</p>
        ) : session ? (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn" onClick={() => router.push('/dashboard')}>
              Zum Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => signOut()}>
              Abmelden
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => signIn('discord')}>
            Mit Discord anmelden
          </button>
        )}
      </div>
    </div>
  );
}
