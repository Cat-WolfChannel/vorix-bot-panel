import mongoose from 'mongoose';

const guildConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    serverDisplayName: { type: String, default: '' },
    teamName: { type: String, default: '' },
    teamRoleId: { type: String, default: '' },
    announceChannelId: { type: String, default: '' },
    announceRoleIds: { type: [String], default: [] },
    ticketLogChannelId: { type: String, default: '' },
    supportVoiceChannelId: { type: String, default: '' },
    welcomeChannelId: { type: String, default: '' },
    autoRoleId: { type: String, default: '' },
    mcStatusChannelId: { type: String, default: '' },
    mcHost: { type: String, default: '' },
    mcPort: { type: String, default: '25565' },
    mcPaper1Name: { type: String, default: 'Paper 1' },
    mcPaper1Host: { type: String, default: '' },
    mcPaper1Port: { type: String, default: '25566' },
    mcPaper2Name: { type: String, default: 'Paper 2' },
    mcPaper2Host: { type: String, default: '' },
    mcPaper2Port: { type: String, default: '25567' },
    mcPaper3Name: { type: String, default: 'Paper 3' },
    mcPaper3Host: { type: String, default: '' },
    mcPaper3Port: { type: String, default: '25568' },
    mcPaper4Name: { type: String, default: 'Paper 4' },
    mcPaper4Host: { type: String, default: '' },
    mcPaper4Port: { type: String, default: '25569' },
  },
  { timestamps: true }
);

export default mongoose.models.GuildConfig || mongoose.model('GuildConfig', guildConfigSchema);
