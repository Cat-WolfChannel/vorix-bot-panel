import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI fehlt in den Vercel Environment Variables.'
    );
  }

  if (MONGODB_URI.includes('<password>') || MONGODB_URI.includes('<username>')) {
    throw new Error(
      'In MONGODB_URI stehen noch Platzhalter <username> oder <password>. Bitte echte Zugangsdaten eintragen.'
    );
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => m)
      .catch((err) => {
        cached.promise = null;
        const msg = err?.message || String(err);
        if (msg.includes('whitelist') || msg.includes('IP') || msg.includes('not authorized')) {
          throw new Error(
            'MongoDB blockiert die Verbindung (IP/Netzwerk). In Atlas unter Network Access muss 0.0.0.0/0 Active sein. Original: ' +
              msg
          );
        }
        if (msg.includes('Authentication failed') || msg.includes('bad auth')) {
          throw new Error(
            'MongoDB Login fehlgeschlagen. Username/Passwort in MONGODB_URI prüfen (Sonderzeichen im Passwort müssen URL-kodiert sein).'
          );
        }
        throw new Error('MongoDB Fehler: ' + msg);
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
