import type { Metadata } from 'next';

import { InOtherWordsDemo } from './in-other-words-demo';

/**
 * A demo of R24, outside `/[speaks]/[learning]/`.
 *
 * It is deliberately not a pair route: it reads no catalogue, calls no API and
 * takes no pair, because there is no episode in the catalogue that carries a
 * restatement yet. Putting it under a pair would make it look like one there
 * was. It prerenders like every other route, so the static export keeps working.
 */
export const metadata: Metadata = {
  title: 'In other words — R24 demo · DiscoPod',
  description: 'A mock-up of the three-rung reading support described in R24.',
};

export default function InOtherWordsDemoPage() {
  return <InOtherWordsDemo />;
}
