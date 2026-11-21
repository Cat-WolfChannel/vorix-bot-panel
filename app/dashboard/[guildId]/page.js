'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  mcHost: '',
  mcPort: '25565',
  mcPaper1Name: 'Paper 1',
  mcPaper1Host: '',
  mcPaper1Port: '25566',
  mcPaper2Name: 'Paper 2',
  mcPaper2Host: '',
  mcPaper2Port: '25567',
  mcPaper3Name: 'Paper 3',
  mcPaper3Host: '',
  mcPaper3Port: '25568',
  mcPaper4Name: 'Paper 4',
  mcPaper4Host: '',
  mcPaper4Port: '25569',
};

export default function GuildSettings() {
  const { status } = useSession();
  const params = useParams();
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
        setConfig({ ...emptyConfig, ...cfg, announceRoleIds: cfg.announceRoleIds || [] });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, guildId]);

  async function save() {
    // Tastatur auf Handy schließen
    if (typeof document !== 'undefined' && document.activeElement) {
      document.activeElement.blur();
    }

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  function toggleAnnounceRole(roleId) {
    const current = config.announceRoleIds || [];
    if (current.includes(roleId)) {
      setConfig({ ...config, announceRoleIds: current.filter((id) => id !== roleId) });
    } else {
      setConfig({ ...config, announceRoleIds: [...current, roleId] });
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

  function TextInput({ label, value, onChange, placeholder, inputMode }) {
    return (
      <div>
        <label>{label}</label>
        <input
          type="text"
          inputMode={inputMode || 'text'}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value || ''}
          placeholder={placeholder || ''}
          onChange={(e) => onChange(e.target.value)}
        />
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
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Kanäle</h3>
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
            label="Ankündigungs-Kanal"
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
        <h3>Rollen</h3>
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
        </div>

        <label>Ankündigungs-Rollen (antippen zum Auswählen)</label>
        <div className="checkbox-list">
          {roles.length === 0 ? (
            <p className="muted" style={{ padding: '0.75rem' }}>
              Keine Rollen gefunden
            </p>
          ) : (
            roles.map((r) => {
              const checked = (config.announceRoleIds || []).includes(r.id);
              return (
                <label key={r.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAnnounceRole(r.id)}
                  />
                  <span>@{r.name}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="card">
        <h3>Minecraft Server</h3>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Host/IP und Port. Leer = nicht anzeigen.
        </p>
        <div className="field-grid">
          <TextInput
            label="Velocity / Proxy Host"
            value={config.mcHost}
            onChange={(v) => setConfig({ ...config, mcHost: v })}
            placeholder="play.nod3.de"
          />
          <TextInput
            label="Velocity / Proxy Port"
            value={config.mcPort}
            onChange={(v) => setConfig({ ...config, mcPort: v })}
            placeholder="36035"
            inputMode="numeric"
          />
          <TextInput
            label="Paper 1 Name"
            value={config.mcPaper1Name}
            onChange={(v) => setConfig({ ...config, mcPaper1Name: v })}
            placeholder="Survival"
          />
          <TextInput
            label="Paper 1 Host"
            value={config.mcPaper1Host}
            onChange={(v) => setConfig({ ...config, mcPaper1Host: v })}
          />
          <TextInput
            label="Paper 1 Port"
            value={config.mcPaper1Port}
            onChange={(v) => setConfig({ ...config, mcPaper1Port: v })}
            inputMode="numeric"
          />
          <TextInput
            label="Paper 2 Name"
            value={config.mcPaper2Name}
            onChange={(v) => setConfig({ ...config, mcPaper2Name: v })}
          />
          <TextInput
            label="Paper 2 Host"
            value={config.mcPaper2Host}
            onChange={(v) => setConfig({ ...config, mcPaper2Host: v })}
          />
          <TextInput
            label="Paper 2 Port"
            value={config.mcPaper2Port}
            onChange={(v) => setConfig({ ...config, mcPaper2Port: v })}
            inputMode="numeric"
          />
          <TextInput
            label="Paper 3 Name"
            value={config.mcPaper3Name}
            onChange={(v) => setConfig({ ...config, mcPaper3Name: v })}
          />
          <TextInput
            label="Paper 3 Host"
            value={config.mcPaper3Host}
            onChange={(v) => setConfig({ ...config, mcPaper3Host: v })}
          />
          <TextInput
            label="Paper 3 Port"
            value={config.mcPaper3Port}
            onChange={(v) => setConfig({ ...config, mcPaper3Port: v })}
            inputMode="numeric"
          />
          <TextInput
            label="Paper 4 Name"
            value={config.mcPaper4Name}
            onChange={(v) => setConfig({ ...config, mcPaper4Name: v })}
          />
          <TextInput
            label="Paper 4 Host"
            value={config.mcPaper4Host}
            onChange={(v) => setConfig({ ...config, mcPaper4Host: v })}
          />
          <TextInput
            label="Paper 4 Port"
            value={config.mcPaper4Port}
            onChange={(v) => setConfig({ ...config, mcPaper4Port: v })}
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="sticky-save">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Speichert...' : 'Einstellungen speichern'}
        </button>
      </div>
    </div>
  );
}
