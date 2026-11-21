'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [guilds, setGuilds] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (status !== 'authenticated') return;

    fetch('/api/guilds')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fehler');
        setGuilds(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="container">
        <p className="muted">Laden...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container">
        <div className="hero">
          <p className="muted">Bitte zuerst anmelden.</p>
          <button className="btn" onClick={() => signIn('discord')}>
            Mit Discord anmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="logo-title">VØRIX Panel</div>
          <p className="muted">Angemeldet als {session.user?.name}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => signOut()}>
          Abmelden
        </button>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Deine Server (Bot ist online)</h2>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Server werden geladen...</p>
      ) : guilds.length === 0 ? (
        <div className="card">
          <p className="muted">
            Der Bot ist auf keinem Server, oder der Bot-Token fehlt in den
            Environment Variables.
          </p>
        </div>
      ) : (
        <div className="guild-grid">
          {guilds.map((g) => (
            <Link key={g.id} href={`/dashboard/${g.id}`} className="guild-card">
              {g.icon ? (
                <img src={g.icon} alt="" className="guild-icon" />
              ) : (
                <div className="guild-icon-placeholder">
                  {g.name?.charAt(0) || '?'}
                </div>
              )}
              <span>{g.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
