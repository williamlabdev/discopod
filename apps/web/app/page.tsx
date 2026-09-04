import { Discover } from './discover';
import { loadDiscoverCatalogue } from '@/lib/catalogue';

/**
 * Server component. The catalogue is fetched from @discopod/api while this
 * builds, so the page ships as static HTML with the ranking already applied —
 * the interactive filtering below it is a client component working over data it
 * was handed, not over a copy of the catalogue kept in the web app.
 */
export default async function Home() {
  const catalogue = await loadDiscoverCatalogue();
  return <Discover catalogue={catalogue} />;
}
