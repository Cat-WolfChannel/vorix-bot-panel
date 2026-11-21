import DiscordProvider from 'next-auth/providers/discord';

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      // Discord liefert seit 2026 iss im Callback (RFC 9207)
      issuer: 'https://discord.com',
      authorization: {
        url: 'https://discord.com/api/oauth2/authorize',
        params: {
          scope: 'identify email guilds',
        },
      },
      token: 'https://discord.com/api/oauth2/token',
      userinfo: 'https://discord.com/api/users/@me',
      checks: ['state'],
      profile(profile) {
        return {
          id: profile.id,
          name: profile.global_name || profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
        };
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = profile.id;
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId;
      }
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function isOwner(discordId) {
  const owners = (process.env.OWNER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (owners.length === 0) return true;
  return owners.includes(String(discordId));
}
