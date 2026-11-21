'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const messages = {
  Configuration:
    'NextAuth ist falsch konfiguriert. Prüfe NEXTAUTH_URL, NEXTAUTH_SECRET, DISCORD_CLIENT_ID und DISCORD_CLIENT_SECRET bei Vercel.',
  AccessDenied:
    'Zugriff verweigert. Entweder hast du den Login abgebrochen, oder OWNER_IDS blockiert deinen Account.',
  Verification: 'Der Login-Link ist ungültig oder abgelaufen.',
  OAuthSignin: 'Discord OAuth konnte nicht gestartet werden. Client ID/Secret prüfen.',
  OAuthCallback: 'Fehler nach dem Discord-Login. Redirect-URL in Discord muss genau zur Vercel-URL passen.',
  OAuthCreateAccount: 'Account konnte nicht erstellt werden.',
  Callback: 'Callback-Fehler. Meist falsche Redirect-URL oder Secret.',
  Default: 'Unbekannter Login-Fehler.',
};

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get('error') || 'Default';
  const text = messages[error] || messages.Default;

  return (
    <div className="container">
      <div className="hero">
        <h1 className="logo-title">Login-Fehler</h1>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Code: <strong>{error}</strong>
        </p>
        <p style={{ marginBottom: '2rem', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          {text}
        </p>
        <Link href="/" className="btn">
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="container"><p className="muted">Laden...</p></div>}>
      <ErrorContent />
    </Suspense>
  );
}
