import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

// Self-hosted Geist: no build-time call to Google Fonts, so the app builds
// offline and in any CI/container without egress to fonts.googleapis.com.
const geistSans = GeistSans;
const geistMono = GeistMono;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Site-wide metadata, and so language-neutral on purpose.
 *
 * This used to say "Learn English through…", from when English was the only
 * language the catalogue taught. `/` is now the pair chooser and every taught
 * language sits below it, so naming one here would be wrong for every visitor
 * who came for another. A pair's own pages name their own languages — see
 * `app/[speaks]/[learning]/episode/[id]/page.tsx`, which builds its title from
 * `LANGUAGE_NAMES[pair.learning]`.
 *
 * The share descriptions said "Learn a language through real conversations",
 * which is the same defect the discovery page's eyebrow had: a promise about
 * audio DiscoPod does not make. Keep every claim here to what the product
 * itself does — it ranks — and it stays true whatever the catalogue holds.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'DiscoPod — Podcasts at your language level',
  description:
    'Learn a language through podcast episodes matched to your listening level and interests.',
  openGraph: {
    title: 'DiscoPod — Podcasts at your level',
    description:
      "Podcast episodes ranked by whether you can follow them, not by what's popular.",
    images: [{ url: '/og.png', width: 1733, height: 908, alt: 'Podcasts at your level.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiscoPod — Podcasts at your level',
    description:
      "Podcast episodes ranked by whether you can follow them, not by what's popular.",
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
