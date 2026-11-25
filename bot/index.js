require('dotenv').config();
const {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, UserSelectMenuBuilder, ButtonBuilder,
  ButtonStyle, ChannelType, PermissionFlagsBits, Partials
} = require('discord.js');
const util = require('minecraft-server-util');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  serverDisplayName: String,
  teamName: String,
  teamRoleId: String,
  announceChannelId: String,
  announceRoleIds: [String],
  ticketLogChannelId: String,
  supportVoiceChannelId: String,
  welcomeChannelId: String,
  autoRoleId: String,
  mcStatusChannelId: String,
  mcHost: String,
  mcPort: String,
  mcPaper1Name: String,
  mcPaper1Host: String,
  mcPaper1Port: String,
  mcPaper2Name: String,
  mcPaper2Host: String,
  mcPaper2Port: String,
  mcPaper3Name: String,
  mcPaper3Host: String,
  mcPaper3Port: String,
  mcPaper4Name: String,
  mcPaper4Host: String,
  mcPaper4Port: String,
});

const GuildConfig =
  mongoose.models.GuildConfig ||
  mongoose.model('GuildConfig', guildConfigSchema);

async function connectMongo() {
  if (!process.env.MONGODB_URI) return;
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

async function getConfig(guildId) {
  try {
    await connectMongo();
    const doc = await GuildConfig.findOne({ guildId }).lean();
    if (!doc) return null;
    return {
      serverDisplayName: doc.serverDisplayName || '',
      teamName: doc.teamName || '',
      teamRoleId: doc.teamRoleId || '',
      announceChannelId: doc.announceChannelId || '',
      announceRoleIds: doc.announceRoleIds || [],
      ticketLogChannelId: doc.ticketLogChannelId || '',
      supportVoiceChannelId: doc.supportVoiceChannelId || '',
      welcomeChannelId: doc.welcomeChannelId || '',
      autoRoleId: doc.autoRoleId || '',
      mcStatusChannelId: doc.mcStatusChannelId || '',
      mcHost: doc.mcHost || '',
      mcPort: doc.mcPort || '25565',
      mcPaper1Name: doc.mcPaper1Name || 'Paper 1',
      mcPaper1Host: doc.mcPaper1Host || '',
      mcPaper1Port: doc.mcPaper1Port || '25566',
      mcPaper2Name: doc.mcPaper2Name || 'Paper 2',
      mcPaper2Host: doc.mcPaper2Host || '',
      mcPaper2Port: doc.mcPaper2Port || '25567',
      mcPaper3Name: doc.mcPaper3Name || 'Paper 3',
      mcPaper3Host: doc.mcPaper3Host || '',
      mcPaper3Port: doc.mcPaper3Port || '25568',
      mcPaper4Name: doc.mcPaper4Name || 'Paper 4',
      mcPaper4Host: doc.mcPaper4Host || '',
      mcPaper4Port: doc.mcPaper4Port || '25569',
    };
  } catch (err) {
    console.log('getConfig Fehler:', err.message);
    return null;
  }
}

function getBrand(config, guild) {
  const server = config?.serverDisplayName || guild?.name || 'VØRIX SMP';
  const team = config?.teamName || `${server} Team`;
  return { server, team };
}

function isSpielerMelden(name) {
  return name.includes('spieler_melden') || name.includes('spieler-melden');
}
function isTeamBewerbung(name) {
  return name.includes('team_bewerbung') || name.includes('team-bewerbung');
}

async function askGemini(userMessage, kategorie = 'Support') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log('GEMINI_API_KEY fehlt');
    return null;
  }

  const system = `Du bist der Support-Assistent vom Discord-Server.
Kategorie: ${kategorie}
Antworte kurz, freundlich und auf Deutsch.
Wenn du die Lösung nicht sicher weißt, sage klar, dass das Team helfen soll.
Keine Bans oder Admin-Aktionen vorschlagen.`;

  const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  const prompt = `${system}\n\n---\n${userMessage}`;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const raw = await res.text();
      if (!res.ok) {
        console.log(`Gemini ${model} HTTP ${res.status}:`, raw.slice(0, 400));
        if (res.status === 429) await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      const data = JSON.parse(raw);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
    } catch (err) {
      clearTimeout(timer);
      console.log(`Gemini ${model}:`, err.name === 'AbortError' ? 'Timeout 20s' : err.message);
    }
  }
  return null;
}

const noAutoRolePath = path.join(__dirname, 'no-autorole.json');
function loadNoAutoRole() {
  try {
    if (fs.existsSync(noAutoRolePath)) return JSON.parse(fs.readFileSync(noAutoRolePath, 'utf8'));
  } catch {}
  return [];
}
function saveNoAutoRole(list) {
  fs.writeFileSync(noAutoRolePath, JSON.stringify(list, null, 2));
}
let noAutoRoleUsers = loadNoAutoRole();
let lastStatus = null;
let lastStatusMessageId = null;
const reportFlow = new Map();
const applyFlow = new Map();

const KATEGORIEN = {
  support: 'Support',
  team_bewerbung: 'Team-Bewerbung',
  media_bewerbung: 'Media-Bewerbung',
  bugmelden: 'Bugmelden',
  spieler_melden: 'Spieler melden',
  team_melden: 'Team-melden',
  sonstiges: 'Sonstiges'
};

client.once('ready', async () => {
  try {
    await connectMongo();
    console.log('MongoDB verbunden');
  } catch (err) {
    console.log('MongoDB:', err.message);
  }
  console.log(`Bot online als ${client.user.tag}`);
  client.user.setActivity('!help', { type: 3 });
  checkMinecraftStatus();
  setInterval(checkMinecraftStatus, 5 * 60 * 1000);
});

client.on('guildMemberAdd', async (member) => {
  const config = await getConfig(member.guild.id);
  if (!config) return;
  const { server, team } = getBrand(config, member.guild);

  if (config.autoRoleId && !noAutoRoleUsers.includes(member.id)) {
    const role = member.guild.roles.cache.get(config.autoRoleId);
    if (role) await member.roles.add(role).catch((e) => console.log('Auto-Role:', e.message));
  }

  if (!config.welcomeChannelId) return;
  const welcomeChannel = await client.channels.fetch(config.welcomeChannelId).catch(() => null);
  if (!welcomeChannel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x9B30FF)
    .setTitle(`Willkommen auf ${server}!`)
    .setDescription(`Hallo ${member}!\n\n**Herzlich Willkommen auf ${server}!**`)
    .addFields({ name: 'Mitgliedsnummer', value: `Du bist unser **${member.guild.memberCount}.** Mitglied!` })
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: server })
    .setTimestamp();

  const files = [];
  if (fs.existsSync('./logo.png')) {
    welcomeEmbed.setImage('attachment://logo.png');
    files.push({ attachment: './logo.png', name: 'logo.png' });
  }
  await welcomeChannel.send({ embeds: [welcomeEmbed], files });

  const dmEmbed = new EmbedBuilder()
    .setColor(0x9B30FF)
    .setTitle(`Willkommen bei ${server}!`)
    .setDescription(
      `Hallo ${member.user.username}!\n\n**Herzlich Willkommen zum ${server}!**\n\n` +
      `Wir hoffen, dir wird es bei uns sehr gefallen!\n\n` +
      `Bitte lies dir vorher noch die **Regeln** durch und markiere sie mit einem gruenen Haken.\n\n` +
      `Danke und hab viel Spass auf ${server}!\n\nMit freundlichen Gruessen\n**${team}**`
    )
    .setFooter({ text: server })
    .setTimestamp();

  const dmFiles = [];
  if (fs.existsSync('./logo.png')) {
    dmEmbed.setThumbnail('attachment://logo.png');
    dmFiles.push({ attachment: './logo.png', name: 'logo.png' });
  }
  try {
    await member.send({ embeds: [dmEmbed], files: dmFiles });
  } catch {
    console.log(`Keine DM an ${member.user.tag}`);
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const config = await getConfig(newMember.guild.id);
  if (!config?.autoRoleId) return;
  const hadRole = oldMember.roles.cache.has(config.autoRoleId);
  const hasRole = newMember.roles.cache.has(config.autoRoleId);
  if (hadRole && !hasRole && !noAutoRoleUsers.includes(newMember.id)) {
    noAutoRoleUsers.push(newMember.id);
    saveNoAutoRole(noAutoRoleUsers);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const config = await getConfig(guild.id);
  if (!config?.supportVoiceChannelId || !config?.ticketLogChannelId) return;
  const logChannel = await client.channels.fetch(config.ticketLogChannelId).catch(() => null);
  if (!logChannel) return;
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;
  const { team } = getBrand(config, guild);

  if (newState.channelId === config.supportVoiceChannelId && oldState.channelId !== config.supportVoiceChannelId) {
    await logChannel.send({
      content: `${member} braucht Hilfe ${config.teamRoleId ? `<@&${config.teamRoleId}>` : ''}`,
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('Support benoetigt')
          .setDescription(`${member} **braucht Hilfe**`)
          .addFields(
            { name: 'User', value: member.user.tag, inline: true },
            { name: 'Kanal', value: `<#${config.supportVoiceChannelId}>`, inline: true }
          )
          .setFooter({ text: team })
          .setTimestamp()
      ]
    });
  }

  if (oldState.channelId === config.supportVoiceChannelId && newState.channelId !== config.supportVoiceChannelId) {
    await logChannel.send({
      content: `${member} braucht keine Hilfe mehr ${config.teamRoleId ? `<@&${config.teamRoleId}>` : ''}`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Support beendet')
          .setDescription(`${member} **braucht keine Hilfe mehr**`)
          .setFooter({ text: team })
          .setTimestamp()
      ]
    });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  const topic = message.channel.topic || '';
  const name = message.channel.name || '';

  if (topic.startsWith('ticket-') && isSpielerMelden(name)) {
    let state = reportFlow.get(message.channel.id);
    if (!state) {
      state = { step: 'names', data: {} };
      reportFlow.set(message.channel.id, state);
    }
    if (state.step === 'done') return;

    const config = await getConfig(message.guild.id);
    const { team } = getBrand(config, message.guild);
    await message.channel.sendTyping().catch(() => {});
    await new Promise((r) => setTimeout(r, 800));

    if (state.step === 'names') {
      state.data.rawNames = message.content;
      state.step = 'action';
      reportFlow.set(message.channel.id, state);
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9B30FF)
            .setTitle('Spieler melden')
            .setDescription('Danke.\n\n**Was hat diese Person gemacht?**\nBitte so genau wie moeglich (Was, Wann, Wo).')
            .setFooter({ text: 'Schritt 2 von 3' })
        ]
      });
      return;
    }

    if (state.step === 'action') {
      state.data.action = message.content;
      state.step = 'proof';
      reportFlow.set(message.channel.id, state);
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9B30FF)
            .setTitle('Spieler melden')
            .setDescription('Hast du **Beweise** (Screenshots, Fotos, Videos, Chat-Logs)?\n\nJa -> hier hochladen oder Link schicken\nNein -> schreib **Nein**')
            .setFooter({ text: 'Schritt 3 von 3' })
        ]
      });
      return;
    }

    if (state.step === 'proof') {
      state.data.proof = message.content;
      if (message.attachments.size > 0) {
        state.data.proof += '\nAnhaenge: ' + [...message.attachments.values()].map((a) => a.url).join(', ');
      }
      state.step = 'done';
      reportFlow.set(message.channel.id, state);
      const summary =
        `**Gemeldete Person**\n${state.data.rawNames}\n\n` +
        `**Was ist passiert?**\n${state.data.action}\n\n` +
        `**Beweise**\n${state.data.proof}`;

      await message.channel.send({
        content: config?.teamRoleId ? `<@&${config.teamRoleId}>` : null,
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`Meldung vollstaendig – ${team} uebernimmt`)
            .setDescription('Danke, alle Infos sind erfasst.\nEin Teammitglied prueft die Meldung.\n\n' + summary.slice(0, 3500))
            .setFooter({ text: team })
            .setTimestamp()
        ]
      });

      if (config?.ticketLogChannelId) {
        const log = message.guild.channels.cache.get(config.ticketLogChannelId);
        if (log) {
          await log.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('Spieler-Meldung bereit')
                .setDescription(`${message.channel}\n\n${summary}`.slice(0, 4000))
                .setFooter({ text: team })
                .setTimestamp()
            ]
          });
        }
      }
      return;
    }
  }

  if (topic.startsWith('ticket-') && isTeamBewerbung(name)) {
    let state = applyFlow.get(message.channel.id);
    if (!state) {
      state = { step: 'role', data: {} };
      applyFlow.set(message.channel.id, state);
    }
    if (state.step === 'done') return;

    const config = await getConfig(message.guild.id);
    const { server, team } = getBrand(config, message.guild);
    await message.channel.sendTyping().catch(() => {});
    await new Promise((r) => setTimeout(r, 800));

    if (state.step === 'role') {
      state.data.role = message.content;
      state.step = 'done';
      applyFlow.set(message.channel.id, state);

      await message.channel.send({
        content: config?.teamRoleId ? `<@&${config.teamRoleId}>` : null,
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`Bewerbung – ${team} uebernimmt`)
            .setDescription(
              `Danke! Deine Bewerbung als **${state.data.role}** bei **${server}** ist erfasst.\n\n` +
              `Ein Mitglied von **${team}** schaut sie sich an und meldet sich.`
            )
            .setFooter({ text: team })
            .setTimestamp()
        ]
      });

      if (config?.ticketLogChannelId) {
        const log = message.guild.channels.cache.get(config.ticketLogChannelId);
        if (log) {
          await log.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('Neue Team-Bewerbung')
                .addFields(
                  { name: 'User', value: `${message.author}`, inline: true },
                  { name: 'Als', value: state.data.role.slice(0, 200), inline: true },
                  { name: 'Ticket', value: `${message.channel}`, inline: true }
                )
                .setFooter({ text: team })
                .setTimestamp()
            ]
          });
        }
      }
      return;
    }
  }

  if (topic.startsWith('ticket-') && !isSpielerMelden(name) && !isTeamBewerbung(name)) {
    const config = await getConfig(message.guild.id);
    if (config?.teamRoleId && message.member?.roles.cache.has(config.teamRoleId)) return;

    const { server, team } = getBrand(config, message.guild);
    const parts = name.split('-');
    const katKey = parts[1] || 'support';
    const kategorieName = KATEGORIEN[katKey] || 'Support';
    let typingLoop;
    try {
      typingLoop = setInterval(() => message.channel.sendTyping().catch(() => {}), 8000);
      await message.channel.sendTyping().catch(() => {});

      const recent = await message.channel.messages.fetch({ limit: 10 });
      const history = recent
        .filter((m) => m.content)
        .map((m) => `${m.author.bot ? 'KI' : m.author.username}: ${m.content}`)
        .reverse()
        .join('\n')
        .slice(-1200);

      const prompt = `Server: ${server}. Team heisst: ${team}.
Ticket-Kategorie: ${kategorieName}
Verlauf:
${history}

Pruefe ob das Anliegen zur Kategorie passt. Wenn nicht: richtiges Ticket vorschlagen
(Support, Bugmelden, Team Bewerbung, Media Bewerbung, Spieler melden, Team melden, Sonstiges).
Sonst kurz helfen. Max 5-8 Saetze. Bei Unsicherheit Team erwaehnen.`;

      await new Promise((r) => setTimeout(r, 800));
      const answer = await askGemini(prompt, kategorieName);

      if (answer) {
        const lower = answer.toLowerCase();
        const needsTeam =
          lower.includes('team') ||
          lower.includes('nicht sicher') ||
          lower.includes('moderator') ||
          lower.includes('mitarbeiter');
        await message.channel.send({
          content: needsTeam && config?.teamRoleId ? `<@&${config.teamRoleId}>` : null,
          embeds: [
            new EmbedBuilder()
              .setColor(0x9B30FF)
              .setTitle(`${server} Support-KI`)
              .setDescription(answer.slice(0, 4000))
              .setFooter({ text: `${team} KI` })
              .setTimestamp()
          ]
        });
      } else {
        await message.channel.send(
          `Die KI ist gerade ueberlastet oder langsam.\n` +
          (config?.teamRoleId ? `<@&${config.teamRoleId}> bitte uebernehmen.` : 'Bitte warte auf das Team.')
        );
      }
    } catch (err) {
      console.log('KI Ticket:', err.message);
      await message.channel.send('KI-Fehler. Bitte Team fragen.').catch(() => {});
    } finally {
      if (typingLoop) clearInterval(typingLoop);
    }
    return;
  }

  if (!message.content.startsWith('!')) return;

  const config = await getConfig(message.guild.id);
  const { server, team } = getBrand(config, message.guild);
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === 'help') {
    const embed = new EmbedBuilder()
      .setColor(0x9B30FF)
      .setTitle(`${server} Bot – Hilfe`)
      .addFields(
        { name: 'Ticket', value: '`!ticket` – Ticket-Panel (Team)' },
        { name: 'Ankuendigung', value: '`!announce [ #kanal ] Nachricht`' },
        { name: 'Status', value: '`!status`' },
        { name: 'IP', value: '`!ip`' },
        { name: 'Hilfe', value: '`!help`' }
      )
      .setFooter({ text: server })
      .setTimestamp();
    const files = [];
    if (fs.existsSync('./logo.png')) {
      embed.setThumbnail('attachment://logo.png');
      files.push({ attachment: './logo.png', name: 'logo.png' });
    }
    return message.channel.send({ embeds: [embed], files });
  }

  if (command === 'ticket') {
    if (!config?.teamRoleId || !message.member.roles.cache.has(config.teamRoleId)) {
      return message.reply('Nur das Team darf das Ticket-Panel senden.');
    }
    const embed = new EmbedBuilder()
      .setColor(0x9B30FF)
      .setTitle(`${server} Ticket System`)
      .setDescription('Waehle eine Kategorie, um ein privates Ticket zu erstellen.')
      .setFooter({ text: server })
      .setTimestamp();
    const files = [];
    if (fs.existsSync('./logo.png')) {
      embed.setThumbnail('attachment://logo.png');
      files.push({ attachment: './logo.png', name: 'logo.png' });
    }
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('Kategorie auswaehlen...')
        .addOptions(
          { label: 'Support', value: 'support', emoji: '🛠️', description: 'Allgemeine Hilfe' },
          { label: 'Team Bewerbung', value: 'team_bewerbung', emoji: '📝', description: 'Bewerbung fuers Team' },
          { label: 'Media Bewerbung', value: 'media_bewerbung', emoji: '📸', description: 'Media / Creator' },
          { label: 'Bugmelden', value: 'bugmelden', emoji: '🐛', description: 'Bug melden' },
          { label: 'Spieler melden', value: 'spieler_melden', emoji: '🚨', description: 'Spieler melden' },
          { label: 'Team melden', value: 'team_melden', emoji: '⚠️', description: 'Teammitglied melden' },
          { label: 'Sonstiges', value: 'sonstiges', emoji: '📌', description: 'Anderes Anliegen' }
        )
    );
    await message.channel.send({ embeds: [embed], components: [row], files });
    if (message.deletable) message.delete().catch(() => {});
  }

  if (command === 'announce') {
    if (!config) return message.reply('Keine Panel-Einstellungen.');
    const hasPermission = message.member.roles.cache.some((r) =>
      (config.announceRoleIds || []).includes(r.id)
    );
    if (!hasPermission) return message.reply('Keine Berechtigung.');
    if (!args.length) return message.reply('`!announce Nachricht` oder `!announce #kanal Nachricht`');

    let targetChannel = null;
    let text = '';
    const first = args[0];
    const mention = first.match(/^<#(\d+)>$/);
    const channelId = mention ? mention[1] : /^\d{17,20}$/.test(first) ? first : null;
    if (channelId) {
      targetChannel = message.guild.channels.cache.get(channelId);
      text = args.slice(1).join(' ');
    } else {
      targetChannel = message.guild.channels.cache.get(config.announceChannelId);
      text = args.join(' ');
    }
    if (!text) return message.reply('Nachricht fehlt.');
    if (!targetChannel) return message.reply('Kanal nicht gefunden.');

    const embed = new EmbedBuilder()
      .setColor(0x9B30FF)
      .setTitle(`${server} Ankuendigung`)
      .setDescription(text)
      .setFooter({ text: `${team} · ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();
    const files = [];
    if (fs.existsSync('./logo.png')) {
      embed.setThumbnail('attachment://logo.png');
      files.push({ attachment: './logo.png', name: 'logo.png' });
    }
    try {
      await targetChannel.send({ embeds: [embed], files });
      message.react('✅').catch(() => {});
      if (message.deletable) message.delete().catch(() => {});
    } catch {
      message.reply('Fehler beim Senden.');
    }
  }

  if (command === 'status' || command === 'mcstatus') {
    if (!config) return message.reply('Keine Panel-Einstellungen.');
    const loading = await message.reply('Pruefe Status...');
    const statusData = await getAllServerStatus(config);
    const built = buildStatusEmbed(statusData, config, server);
    await loading.edit({ content: null, embeds: [built.embed], components: built.components });
  }

  if (command === 'ip') {
    const ip = config?.mcHost
      ? `${config.mcHost}${config.mcPort && config.mcPort !== '25565' ? ':' + config.mcPort : ''}`
      : 'play.nod3.de:36035';
    const embed = new EmbedBuilder()
      .setColor(0x9B30FF)
      .setTitle(`${server} – Server IP`)
      .addFields({ name: 'IP', value: '```' + ip + '```' })
      .setFooter({ text: server })
      .setTimestamp();
    const files = [];
    if (fs.existsSync('./logo.png')) {
      embed.setThumbnail('attachment://logo.png');
      files.push({ attachment: './logo.png', name: 'logo.png' });
    }
    await message.channel.send({ embeds: [embed], files });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;
  const config = await getConfig(interaction.guild.id);
  const { server, team } = getBrand(config, interaction.guild);

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
    if (!config) return interaction.reply({ content: 'Keine Config.', ephemeral: true });

    const key = interaction.values[0];
    const kategorieName = KATEGORIEN[key] || 'Ticket';

    const existing = interaction.guild.channels.cache.find((c) => c.topic === `ticket-${interaction.user.id}`);
    if (existing) {
      return interaction.reply({ content: `Du hast bereits ein Ticket: ${existing}`, ephemeral: true });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${key}-${interaction.user.username}`.toLowerCase().replace(/ /g, '-'),
      type: ChannelType.GuildText,
      topic: `ticket-${interaction.user.id}`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages
          ]
        },
        ...(config.teamRoleId
          ? [{
              id: config.teamRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }]
          : [])
      ]
    });

    const hint =
      key === 'spieler_melden'
        ? 'Die KI fuehrt dich jetzt durch die Meldung.'
        : key === 'team_bewerbung'
          ? 'Die KI fragt zuerst, als was du dich bewerben willst. Danach uebernimmt das Team.'
          : 'Beschreibe dein Anliegen – die KI hilft dir, oder warte auf das Team.';

    const openEmbed = new EmbedBuilder()
      .setColor(0x9B30FF)
      .setTitle(`${kategorieName} Ticket`)
      .setDescription(`Hallo ${interaction.user}!\n\nDu hast ein **${kategorieName}**-Ticket auf **${server}** erstellt.\n${hint}`)
      .setFooter({ text: team })
      .setTimestamp();

    const files = [];
    if (fs.existsSync('./logo.png')) {
      openEmbed.setThumbnail('attachment://logo.png');
      files.push({ attachment: './logo.png', name: 'logo.png' });
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claimen').setStyle(ButtonStyle.Success).setEmoji('✋'),
      new ButtonBuilder().setCustomId('add_user').setLabel('User hinzufuegen').setStyle(ButtonStyle.Primary).setEmoji('➕'),
      new ButtonBuilder().setCustomId('ai_help').setLabel('KI Hilfe').setStyle(ButtonStyle.Secondary).setEmoji('🤖'),
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Schliessen').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    await channel.send({
      content: config.teamRoleId ? `<@&${config.teamRoleId}>` : null,
      embeds: [openEmbed],
      components: [buttons],
      files
    });

    if (config.ticketLogChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.ticketLogChannelId);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('Neues Ticket')
              .addFields(
                { name: 'Von', value: `${interaction.user}`, inline: true },
                { name: 'Kategorie', value: kategorieName, inline: true },
                { name: 'Channel', value: `${channel}`, inline: true }
              )
              .setFooter({ text: team })
              .setTimestamp()
          ]
        });
      }
    }

    if (key === 'spieler_melden') {
      reportFlow.set(channel.id, { step: 'names', data: {} });
      setTimeout(async () => {
        await channel.sendTyping().catch(() => {});
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x9B30FF)
              .setTitle('Spieler melden')
              .setDescription('Wen moechtest du melden?\n\nBitte antworte **genau in diesem Format:**\n```\nMinecraft-Name: \nDiscord-Name: \n```')
              .setFooter({ text: 'Schritt 1 von 3' })
          ]
        });
      }, 1200);
    } else if (key === 'team_bewerbung') {
      applyFlow.set(channel.id, { step: 'role', data: {} });
      setTimeout(async () => {
        await channel.sendTyping().catch(() => {});
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x9B30FF)
              .setTitle(`${team} – Bewerbung`)
              .setDescription(`Willkommen bei der Bewerbung fuer **${server}**!\n\n**Als was moechtest du dich bewerben?**\n(z. B. Moderator, Builder, Helper, Developer)`)
              .setFooter({ text: 'Schritt 1 – danach uebernimmt das Team' })
          ]
        });
      }, 1200);
    } else {
      setTimeout(async () => {
        try {
          await channel.sendTyping().catch(() => {});
          const intro = await askGemini(
            `Server heisst "${server}", Team heisst "${team}".
Ein User hat ein Ticket "${kategorieName}" geoeffnet.
Schreibe eine kurze Begruessung auf Deutsch (2-4 Saetze).
Frage konkret nach dem Anliegen passend zur Kategorie.
Nenne den Server- und Teamnamen natuerlich.`,
            kategorieName
          );
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x9B30FF)
                .setTitle(`${server} Support-KI`)
                .setDescription(
                  (intro || `Hallo! Du bist im **${kategorieName}**-Ticket auf **${server}**.\nBitte beschreibe kurz dein Anliegen. ${team} hilft dir.`)
                    .slice(0, 4000)
                )
                .setFooter({ text: team })
            ]
          });
        } catch (e) {
          console.log('KI Intro:', e.message);
        }
      }, 1500);
    }

    await interaction.reply({ content: `Ticket erstellt: ${channel}`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'claim_ticket') {
    if (config?.teamRoleId && !interaction.member.roles.cache.has(config.teamRoleId)) {
      return interaction.reply({ content: 'Nur Team.', ephemeral: true });
    }
    if (interaction.channel.topic?.includes('|claimed:')) {
      return interaction.reply({ content: 'Schon geclaimed.', ephemeral: true });
    }
    await interaction.channel.setTopic(`${interaction.channel.topic}|claimed:${interaction.user.id}`);
    await interaction.channel.send({
      embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`Geclaimed von ${interaction.user}`)]
    });
    await interaction.reply({ content: 'Geclaimed!', ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'add_user') {
    if (config?.teamRoleId && !interaction.member.roles.cache.has(config.teamRoleId)) {
      return interaction.reply({ content: 'Nur Team.', ephemeral: true });
    }
    const row = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder().setCustomId('select_user_to_add').setPlaceholder('User...').setMinValues(1).setMaxValues(1)
    );
    await interaction.reply({ content: 'User waehlen:', components: [row], ephemeral: true });
  }

  if (interaction.isUserSelectMenu() && interaction.customId === 'select_user_to_add') {
    const user = interaction.users.first();
    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true
    });
    await interaction.channel.send(`${user} wurde von ${interaction.user} hinzugefuegt.`);
    await interaction.update({ content: `${user} hinzugefuegt.`, components: [] });
  }

  if (interaction.isButton() && interaction.customId === 'ai_help') {
    await interaction.deferReply();
    const typingLoop = setInterval(() => interaction.channel.sendTyping().catch(() => {}), 8000);
    await interaction.channel.sendTyping().catch(() => {});
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 15 });
      const userLines = messages
        .filter((m) => !m.author.bot && m.content)
        .map((m) => `${m.author.username}: ${m.content}`)
        .reverse()
        .join('\n')
        .slice(-1500);
      if (!userLines.trim()) {
        clearInterval(typingLoop);
        return interaction.editReply('Erst Anliegen schreiben, dann KI Hilfe.');
      }
      await new Promise((r) => setTimeout(r, 1500));
      const kat = interaction.channel.name.split('-')[1] || 'Support';
      const answer = await askGemini(
        `Server: ${server}. Team: ${team}.\n${userLines}`,
        KATEGORIEN[kat] || kat
      );
      clearInterval(typingLoop);
      if (!answer) {
        return interaction.editReply(
          `KI nicht erreichbar. ${config?.teamRoleId ? `<@&${config.teamRoleId}>` : team} bitte helfen.`
        );
      }
      const lower = answer.toLowerCase();
      const needsTeam = lower.includes('team') || lower.includes('nicht sicher') || lower.includes('moderator');
      await interaction.editReply({
        content: needsTeam && config?.teamRoleId ? `<@&${config.teamRoleId}>` : null,
        embeds: [
          new EmbedBuilder()
            .setColor(0x9B30FF)
            .setTitle(`${server} KI Hilfe`)
            .setDescription(answer.slice(0, 4000))
            .setFooter({ text: team })
            .setTimestamp()
        ]
      });
    } catch (err) {
      clearInterval(typingLoop);
      console.log('ai_help:', err.message);
      await interaction.editReply('Fehler bei der KI.');
    }
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    if (config?.ticketLogChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.ticketLogChannelId);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('Ticket geschlossen')
              .addFields(
                { name: 'Von', value: `${interaction.user}`, inline: true },
                { name: 'Channel', value: interaction.channel.name, inline: true }
              )
              .setFooter({ text: team })
              .setTimestamp()
          ]
        });
      }
    }
    reportFlow.delete(interaction.channel.id);
    applyFlow.delete(interaction.channel.id);
    await interaction.reply('Ticket wird in 5 Sekunden geschlossen...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }

  if (interaction.isButton() && interaction.customId === 'refresh_mc_status') {
    await interaction.deferUpdate();
    await interaction.message.delete().catch(() => {});
    lastStatusMessageId = null;
    await sendMinecraftStatus(interaction.channel, config);
  }
});

async function getServerStatus(host, port) {
  if (!host) return { online: false };
  try {
    const result = await util.status(host, parseInt(port) || 25565, { timeout: 5000, enableSRV: true });
    return {
      online: true,
      players: `${result.players.online}/${result.players.max}`,
      version: result.version.name
    };
  } catch {
    return { online: false };
  }
}

async function getAllServerStatus(config) {
  return {
    velocity: await getServerStatus(config?.mcHost, config?.mcPort),
    paper1: await getServerStatus(config?.mcPaper1Host, config?.mcPaper1Port),
    paper2: await getServerStatus(config?.mcPaper2Host, config?.mcPaper2Port),
    paper3: await getServerStatus(config?.mcPaper3Host, config?.mcPaper3Port),
    paper4: await getServerStatus(config?.mcPaper4Host, config?.mcPaper4Port)
  };
}

function buildStatusEmbed(statusData, config, serverName) {
  const { velocity, paper1, paper2, paper3, paper4 } = statusData;
  const name = serverName || 'Server';
  const embed = new EmbedBuilder()
    .setColor(velocity.online ? 0x57F287 : 0xED4245)
    .setTitle(velocity.online ? `${name} – Online` : `${name} – Offline`)
    .addFields({
      name: 'Velocity Proxy',
      value: velocity.online
        ? `Online\nSpieler: **${velocity.players}**\nVersion: ${velocity.version}`
        : 'Offline'
    })
    .setFooter({ text: `${name} · Update alle 5 Min` })
    .setTimestamp();

  if (config?.mcPaper1Host) {
    embed.addFields({
      name: config.mcPaper1Name || 'Paper 1',
      value: paper1.online ? `Online – ${paper1.players}` : 'Offline',
      inline: true
    });
  }
  if (config?.mcPaper2Host) {
    embed.addFields({
      name: config.mcPaper2Name || 'Paper 2',
      value: paper2.online ? `Online – ${paper2.players}` : 'Offline',
      inline: true
    });
  }
  if (config?.mcPaper3Host) {
    embed.addFields({
      name: config.mcPaper3Name || 'Paper 3',
      value: paper3.online ? `Online – ${paper3.players}` : 'Offline',
      inline: true
    });
  }
  if (config?.mcPaper4Host) {
    embed.addFields({
      name: config.mcPaper4Name || 'Paper 4',
      value: paper4.online ? `Online – ${paper4.players}` : 'Offline',
      inline: true
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('refresh_mc_status').setLabel('Aktualisieren').setStyle(ButtonStyle.Primary).setEmoji('🔄')
  );
  return { embed, components: [row] };
}

async function sendMinecraftStatus(channel, config) {
  if (!config) return;
  const statusData = await getAllServerStatus(config);
  const { velocity } = statusData;
  const server = config.serverDisplayName || 'Server';

  if (lastStatus === false && velocity.online) {
    await channel.send({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle(`${server} ist wieder online!`).setTimestamp()] });
  }
  if (lastStatus === true && !velocity.online) {
    await channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle(`${server} ist offline!`).setTimestamp()] });
  }
  lastStatus = velocity.online;

  if (lastStatusMessageId) {
    const old = await channel.messages.fetch(lastStatusMessageId).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }
  const built = buildStatusEmbed(statusData, config, server);
  const msg = await channel.send({ embeds: [built.embed], components: built.components });
  lastStatusMessageId = msg.id;
}

async function checkMinecraftStatus() {
  try {
    await connectMongo();
    const configs = await GuildConfig.find({ mcStatusChannelId: { $ne: '' } }).lean();
    for (const doc of configs) {
      const config = await getConfig(doc.guildId);
      if (!config?.mcStatusChannelId) continue;
      const channel = await client.channels.fetch(config.mcStatusChannelId).catch(() => null);
      if (channel) await sendMinecraftStatus(channel, config);
    }
  } catch (err) {
    console.log('Status-Check:', err.message);
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);
