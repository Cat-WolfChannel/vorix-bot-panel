import mongoose from 'mongoose';

const guildConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    teamRoleId: { type: String, default: '' },
    announceChannelId: { type: String, default: '' },
    announceRoleIds: { type: [String], default: [] },
    ticketLogChannelId: { type: String, default: '' },
    supportVoiceChannelId: { type: String, default: '' },
    welcomeChannelId: { type: String, default: '' },
    autoRoleId: { type: String, default: '' },
    mcStatusChannelId: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.GuildConfig || mongoose.model('GuildConfig', guildConfigSchema);
