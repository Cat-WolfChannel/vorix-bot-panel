# Bot-Integration

Damit der Bot die Panel-Einstellungen nutzt, brauchst du im Bot (Quaxly):

1. `mongoose` installieren
2. `MONGODB_URI` in die Bot-`.env`
3. Config aus der DB laden

## Beispiel im Bot

```js
const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  teamRoleId: String,
  announceChannelId: String,
  announceRoleIds: [String],
  ticketLogChannelId: String,
  supportVoiceChannelId: String,
  welcomeChannelId: String,
  autoRoleId: String,
  mcStatusChannelId: String,
});

const GuildConfig = mongoose.models.GuildConfig || mongoose.model('GuildConfig', guildConfigSchema);

async function getConfig(guildId) {
  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await GuildConfig.findOne({ guildId });
  if (!doc) return null;
  return {
    teamRoleId: doc.teamRoleId,
    announceChannelId: doc.announceChannelId,
    announceRoleIds: doc.announceRoleIds || [],
    ticketLogChannelId: doc.ticketLogChannelId,
    supportVoiceChannelId: doc.supportVoiceChannelId,
    welcomeChannelId: doc.welcomeChannelId,
    autoRoleId: doc.autoRoleId,
    mcStatusChannelId: doc.mcStatusChannelId,
  };
}
```

Dann statt `process.env.TEAM_ROLE_ID` usw. `const config = await getConfig(guild.id)` nutzen.
