import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWS KI Manager — Artificial Workstation System',
  description: 'Kostenloser persönlicher KI-Manager für Alltag, News, Wetter, Aufgaben, Navigation und Dateien.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de"><body>{children}</body></html>;
}
