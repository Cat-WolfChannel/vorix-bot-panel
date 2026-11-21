'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState, useCallback, memo } from 'react';
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

// Außerhalb der Seite definiert = kein Remount bei jedem Tastendruck
const TextInput = memo(function TextInput({ label, value, onChange, placeholder, inputMode, fieldKey }) {
  return (
    <div>
      <label htmlFor={fieldKey}>{label}</label>
      <input
        id={fieldKey}
        name={fieldKey}
        type="text"
        inputMode={inputMode || 'text'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value ?? ''}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
      />
    </div>
  );
});

const ChannelSelect = memo(function ChannelSelect({ label, value, onChange, channels, fieldKey }) {
  return (
    <div>
      <label htmlFor={fieldKey}>{label}</label>
      <select
        id={fieldKey}
        name={fieldKey}
        value={value || ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
      >
        <option value="">— Nicht gesetzt —</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            #{c.name}
          </option>
        ))}
      </select>
    </div>
  );
});

const RoleSelect = memo(function RoleSelect({ label, value, onChange, roles, fieldKey }) {
  return (
    <div>
      <label htmlFor={fieldKey}>{label}</label>
      <select
        id={fieldKey}
        name={fieldKey}
        value={value || ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
      >
        <option value="">— Nicht gesetzt —</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            @{r.name}
          </option>
        ))}
      </select>
    </div>
  );
});

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

  // Stabile Callbacks – verhindern unnötige Remounts
  const setField = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAnnounceRole = useCallback((roleId) => {
    setConfig((prev) => {
      const current = prev.announceRoleIds || [];
      const next = current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId];
      return { ...prev, announceRoleIds: next };
    });
  }, []);

  async function save() {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
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
            fieldKey="welcomeChannelId"
            value={config.welcomeChannelId}
            onChange={setField}
            channels={textChannels}
          />
          <ChannelSelect
            label="Ticket-Log Kanal"
            fieldKey="ticketLogChannelId"
            value={config.ticketLogChannelId}
            onChange={setField}
            channels={textChannels}
          />
          <ChannelSelect
            label="Ankündigungs-Kanal"
            fieldKey="announceChannelId"
            value={config.announceChannelId}
            onChange={setField}
            channels={textChannels}
          />
          <ChannelSelect
            label="Minecraft Status-Kanal"
            fieldKey="mcStatusChannelId"
            value={config.mcStatusChannelId}
            onChange={setField}
            channels={textChannels}
          />
          <ChannelSelect
            label="Support-Sprachkanal"
            fieldKey="supportVoiceChannelId"
            value={config.supportVoiceChannelId}
            onChange={setField}
            channels={voiceChannels}
          />
        </div>
      </div>

      <div className="card">
        <h3>Rollen</h3>
        <div className="field-grid">
          <RoleSelect
            label="Team-Rolle"
            fieldKey="teamRoleId"
            value={config.teamRoleId}
            onChange={setField}
            roles={roles}
          />
          <RoleSelect
            label="Auto-Role (bei Join)"
            fieldKey="autoRoleId"
            value={config.autoRoleId}
            onChange={setField}
            roles={roles}
          />
        </div>

        <label>Ankündigungs-Rollen (antippen)</label>
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
            fieldKey="mcHost"
            value={config.mcHost}
            onChange={setField}
            placeholder="play.nod3.de"
          />
          <TextInput
            label="Velocity / Proxy Port"
            fieldKey="mcPort"
            value={config.mcPort}
            onChange={setField}
            placeholder="36035"
            inputMode="numeric"
          />
          <TextInput
            label="Paper 1 Name"
            fieldKey="mcPaper1Name"
            value={config.mcPaper1Name}
            onChange={setField}
            placeholder="Survival"
          />
          <TextInput
            label="Paper 1 Host"
            fieldKey="mcPaper1Host"
            value={config.mcPaper1Host}
            onChange={setField}
          />
          <TextInput
            label="Paper 1 Port"
            fieldKey="mcPaper1Port"
            value={config.mcPaper1Port}
            onChange={setField}
            inputMode="numeric"
          />
          <TextInput
            label="Paper 2 Name"
            fieldKey="mcPaper2Name"
            value={config.mcPaper2Name}
            onChange={setField}
          />
          <TextInput
            label="Paper 2 Host"
            fieldKey="mcPaper2Host"
            value={config.mcPaper2Host}
            onChange={setField}
          />
          <TextInput
            label="Paper 2 Port"
            fieldKey="mcPaper2Port"
            value={config.mcPaper2Port}
            onChange={setField}
            inputMode="numeric"
          />
          <TextInput
            label="Paper 3 Name"
            fieldKey="mcPaper3Name"
            value={config.mcPaper3Name}
            onChange={setField}
          />
          <TextInput
            label="Paper 3 Host"
            fieldKey="mcPaper3Host"
            value={config.mcPaper3Host}
            onChange={setField}
          />
          <TextInput
            label="Paper 3 Port"
            fieldKey="mcPaper3Port"
            value={config.mcPaper3Port}
            onChange={setField}
            inputMode="numeric"
          />
          <TextInput
            label="Paper 4 Name"
            fieldKey="mcPaper4Name"
            value={config.mcPaper4Name}
            onChange={setField}
          />
          <TextInput
            label="Paper 4 Host"
            fieldKey="mcPaper4Host"
            value={config.mcPaper4Host}
            onChange={setField}
          />
          <TextInput
            label="Paper 4 Port"
            fieldKey="mcPaper4Port"
            value={config.mcPaper4Port}
            onChange={setField}
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="sticky-save">
        <button type="button" className="btn" onClick={save} disabled={saving}>
          {saving ? 'Speichert...' : 'Einstellungen speichern'}
        </button>
      </div>
    </div>
  );
}
