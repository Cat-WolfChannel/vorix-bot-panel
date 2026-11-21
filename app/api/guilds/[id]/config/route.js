import { getServerSession } from 'next-auth';
import { authOptions, isOwner } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GuildConfig from '@/lib/models/GuildConfig';

const empty = {
  guildId: '',
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

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !isOwner(session.user.discordId)) {
    return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  try {
    await connectDB();
    const config = await GuildConfig.findOne({ guildId: params.id });
    return Response.json(config || { ...empty, guildId: params.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !isOwner(session.user.discordId)) {
    return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  try {
    const body = await req.json();
    await connectDB();

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: params.id },
      {
        guildId: params.id,
        teamRoleId: body.teamRoleId || '',
        announceChannelId: body.announceChannelId || '',
        announceRoleIds: body.announceRoleIds || [],
        ticketLogChannelId: body.ticketLogChannelId || '',
        supportVoiceChannelId: body.supportVoiceChannelId || '',
        welcomeChannelId: body.welcomeChannelId || '',
        autoRoleId: body.autoRoleId || '',
        mcStatusChannelId: body.mcStatusChannelId || '',
        mcHost: body.mcHost || '',
        mcPort: body.mcPort || '25565',
        mcPaper1Name: body.mcPaper1Name || 'Paper 1',
        mcPaper1Host: body.mcPaper1Host || '',
        mcPaper1Port: body.mcPaper1Port || '25566',
        mcPaper2Name: body.mcPaper2Name || 'Paper 2',
        mcPaper2Host: body.mcPaper2Host || '',
        mcPaper2Port: body.mcPaper2Port || '25567',
        mcPaper3Name: body.mcPaper3Name || 'Paper 3',
        mcPaper3Host: body.mcPaper3Host || '',
        mcPaper3Port: body.mcPaper3Port || '25568',
        mcPaper4Name: body.mcPaper4Name || 'Paper 4',
        mcPaper4Host: body.mcPaper4Host || '',
        mcPaper4Port: body.mcPaper4Port || '25569',
      },
      { upsert: true, new: true }
    );

    return Response.json({ ok: true, config });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
