/**
 * "Auto-translated", wherever machine-written learner-language text is shown.
 *
 * ADR 0017 put this label on the transcript overlay, because the overlay was
 * the only machine translation in the app. ADR 0018's Vietnamese pair made
 * every learner-facing string machine-written — the description, the level
 * reason, the learning goal, every vocabulary meaning — so a label that lives
 * only inside the transcript panel understates what the reader has been
 * reading since the first card.
 *
 * It is a label, not a warning: the text is still shown, and shown by default.
 * The claim being made is about who wrote it, which is the same claim
 * `EpisodeCard.autoTranslated` carries.
 */
export function AutoTranslated({ className = '' }: { className?: string }) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground ${className}`}
    >
      Auto-translated
    </span>
  );
}
