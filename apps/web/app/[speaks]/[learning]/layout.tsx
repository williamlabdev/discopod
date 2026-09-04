import { pairFromParams, type PairParams } from './pair';

/**
 * Declares the language of everything inside this pair's pages.
 *
 * The root layout's `<html lang="en">` stops being true the moment a second
 * pair exists: a `zh-Hant → en` page is Chinese prose with English quoted
 * inside it. Only the root layout may render `<html>`, so the correction is
 * made here, on the nearest common ancestor of the pair's content — which is
 * exactly what `lang` is scoped to do. It is `speaks`, not `learning`: the page
 * talks to the learner in their own language, and the audio's language belongs
 * to the transcript, not to the document.
 */
export default async function PairLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: PairParams;
}) {
  const pair = await pairFromParams(params);
  return <div lang={pair.speaks}>{children}</div>;
}
