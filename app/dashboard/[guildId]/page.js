'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const emptyConfig = {
  teamRoleId: '',
  announceChannelId: '',
  announceRoleIds: [],
  ticketLogChannelId: '',
  supportVoiceChannelId: '',
  welcomeChannelId: '',
  autoRoleId: '',
  mcStatusChannelId: '',
};

export default function GuildSettings() {
  const { status } = useSession();
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId;

  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState(emptyConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || !guildId) return;

    Promise.all([
      fetch(`/api/guilds/${guildId}/channels`).then((r) => r.json()),
      fetch(`/api/guilds/${guildId}/roles`).then((r) => r.json()),
      fetch(`/api/guilds/${guildId}/config`).then((r) => r.json()),
    ])
      .then(([ch, ro, cfg]) => {
        if (ch.error) throw new Error(ch.error);
        if (ro.error) throw new Error(ro.error);
        if (cfg.error) throw new Error(cfg.error);
        setTextChannels(ch.text || []);
        setVoiceChannels(ch.voice || []);
        setRoles(ro || []);
        setConfig({ ...emptyConfig, ...cfg });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, guildId]);

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
      setMessage('Gespeichert!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container">
        <p className="muted">Laden...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container">
        <button className="btn" onClick={() => signIn('discord')}>
          Mit Discord anmelden
        </button>
      </div>
    );
  }

  function ChannelSelect({ label, value, onChange, channels }) {
    return (
      <div>
        <label>{label}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Nicht gesetzt —</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function RoleSelect({ label, value, onChange }) {
    return (
      <div>
        <label>{label}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Nicht gesetzt —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              @{r.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <Link href="/dashboard" className="muted">
            ← Zurück zu Servern
          </Link>
          <div className="logo-title" style={{ marginTop: '0.5rem' }}>
            Server einstellen
          </div>
          <p className="muted">ID: {guildId}</p>
        </div>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Speichert...' : 'Speichern'}
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Kanäle</h3>
        <div className="field-grid">
          <ChannelSelect
            label="Willkommens-Kanal"
            value={config.welcomeChannelId}
            onChange={(v) => setConfig({ ...config, welcomeChannelId: v })}
            channels={textChannels}
          />
          <ChannelSelect
            label="Ticket-Log Kanal"
            value={config.ticketLogChannelId}
            onChange={(v) => setConfig({ ...config, ticketLogChannelId: v })}
            channels={textChannels}
          />
          <ChannelSelect
            label="Ankündigungs-Kanal (Standard)"
            value={config.announceChannelId}
            onChange={(v) => setConfig({ ...config, announceChannelId: v })}
            channels={textChannels}
          />
          <ChannelSelect
            label="Minecraft Status-Kanal"
            value={config.mcStatusChannelId}
            onChange={(v) => setConfig({ ...config, mcStatusChannelId: v })}
            channels={textChannels}
          />
          <ChannelSelect
            label="Support-Sprachkanal"
            value={config.supportVoiceChannelId}
            onChange={(v) => setConfig({ ...config, supportVoiceChannelId: v })}
            channels={voiceChannels}
          />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Rollen</h3>
        <div className="field-grid">
          <RoleSelect
            label="Team-Rolle"
            value={config.teamRoleId}
            onChange={(v) => setConfig({ ...config, teamRoleId: v })}
          />
          <RoleSelect
            label="Auto-Role (bei Join)"
            value={config.autoRoleId}
            onChange={(v) => setConfig({ ...config, autoRoleId: v })}
          />
          <div>
            <label>Ankündigungs-Rollen (mehrere mit Strg/Cmd)</label>
            <select
              multiple
              size={Math.min(6, roles.length || 3)}
              value={config.announceRoleIds || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                setConfig({ ...config, announceRoleIds: selected });
              }}
              style={{ minHeight: '120px' }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  @{r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? 'Speichert...' : 'Einstellungen speichern'}
      </button>
    </div>
  );
}
