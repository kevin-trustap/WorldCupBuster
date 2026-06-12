import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorldCupBuster',
  description: 'FIFA World Cup 2026 Group Sweepstakes — Wooden Spoon & Glory Edition',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#1A1A1A', color: '#FFFFFF', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
