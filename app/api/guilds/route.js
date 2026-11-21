import { getServerSession } from 'next-auth';
import { authOptions, isOwner } from '@/lib/auth';
import { getBotGuilds } from '@/lib/discord';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return Response.json({ error: 'Nicht eingeloggt' }, { status: 401 });
  }
  if (!isOwner(session.user.discordId)) {
    return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  try {
    const guilds = await getBotGuilds();
    return Response.json(
      guilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon
          ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
          : null,
      }))
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
