# VØRIX Bot Panel

Kostenloses Control-Panel für deinen Discord-Bot.

## Features
- Login mit Discord
- Server anzeigen, auf denen der Bot ist
- Kanäle & Rollen auswählen
- Einstellungen pro Server speichern (MongoDB)

## Setup (gratis)

### 1. Discord Application
1. https://discord.com/developers/applications → Application wählen/erstellen
2. **OAuth2** → Redirects hinzufügen:
   - `http://localhost:3000/api/auth/callback/discord`
   - `https://DEINE-VERCEL-URL.vercel.app/api/auth/callback/discord`
3. Client ID + Client Secret kopieren
4. Bot-Token unter **Bot** kopieren

### 2. MongoDB Atlas (gratis)
1. https://www.mongodb.com/cloud/atlas → Free Cluster erstellen
2. Database User anlegen
3. Network Access → `0.0.0.0/0` erlauben
4. Connect → Connection String kopieren

### 3. Vercel deployen
1. https://vercel.com → Mit GitHub einloggen
2. **Import** dieses Repos
3. Environment Variables eintragen (siehe `.env.example`)
4. Deploy

### 4. Bot anpassen
Der Bot muss die Config aus MongoDB lesen statt nur aus `.env`.
Siehe `bot-integration.md`.

## Lokal testen
```bash
npm install
cp .env.example .env.local
# .env.local ausfüllen
npm run dev
```
