import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

// Self-hosted Geist: no build-time call to Google Fonts, so the app builds
// offline and in any CI/container without egress to fonts.googleapis.com.
const geistSans = GeistSans;
const geistMono = GeistMono;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'DiscoPod — Podcasts at your language level',
  description: 'Learn English through podcast episodes matched to your listening level and interests.',
  openGraph: {
    title: 'DiscoPod — Podcasts at your level',
    description: 'Learn English through real conversations.',
    images: [{ url: '/og.png', width: 1733, height: 908, alt: 'Podcasts at your level.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiscoPod — Podcasts at your level',
    description: 'Learn English through real conversations.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
