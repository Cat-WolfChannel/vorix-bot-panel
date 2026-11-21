const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const API = 'https://discord.com/api/v10';

async function botFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getBotGuilds() {
  return botFetch('/users/@me/guilds');
}

export async function getGuildChannels(guildId) {
  return botFetch(`/guilds/${guildId}/channels`);
}

export async function getGuildRoles(guildId) {
  const roles = await botFetch(`/guilds/${guildId}/roles`);
  return roles.filter((r) => r.name !== '@everyone').sort((a, b) => b.position - a.position);
}

export async function getGuild(guildId) {
  return botFetch(`/guilds/${guildId}`);
}
