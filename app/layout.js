import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'VØRIX Bot Panel',
  description: 'Control Panel für den VØRIX Discord Bot',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
