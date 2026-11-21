import { getServerSession } from 'next-auth';
import { authOptions, isOwner } from '@/lib/auth';
import { getGuildChannels } from '@/lib/discord';

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !isOwner(session.user.discordId)) {
    return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  try {
    const channels = await getGuildChannels(params.id);
    const text = channels
      .filter((c) => c.type === 0 || c.type === 5)
      .map((c) => ({ id: c.id, name: c.name, type: c.type }));
    const voice = channels
      .filter((c) => c.type === 2)
      .map((c) => ({ id: c.id, name: c.name, type: c.type }));
    return Response.json({ text, voice });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
