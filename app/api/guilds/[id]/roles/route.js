import { getServerSession } from 'next-auth';
import { authOptions, isOwner } from '@/lib/auth';
import { getGuildRoles } from '@/lib/discord';

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !isOwner(session.user.discordId)) {
    return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  try {
    const roles = await getGuildRoles(params.id);
    return Response.json(
      roles.map((r) => ({ id: r.id, name: r.name, color: r.color }))
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
