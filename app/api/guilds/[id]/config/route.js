import { getServerSession } from 'next-auth';
import { authOptions, isOwner } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GuildConfig from '@/lib/models/GuildConfig';

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !isOwner(session.user.discordId)) {
    return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  try {
    await connectDB();
    const config = await GuildConfig.findOne({ guildId: params.id });
    return Response.json(
      config || {
        guildId: params.id,
        teamRoleId: '',
        announceChannelId: '',
        announceRoleIds: [],
        ticketLogChannelId: '',
        supportVoiceChannelId: '',
        welcomeChannelId: '',
        autoRoleId: '',
        mcStatusChannelId: '',
      }
    );
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
      },
      { upsert: true, new: true }
    );

    return Response.json({ ok: true, config });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
