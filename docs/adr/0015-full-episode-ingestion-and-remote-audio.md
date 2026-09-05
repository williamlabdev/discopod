# ADR 0015 — Ingested podcast episodes ship full-length and stream from the publisher

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Builds on:** [ADR 0007](0007-fsi-is-a-pipeline-fixture-not-a-catalogue-source.md)
  decision 5, which named permission as the critical path for a Mandarin catalogue. The 24
  episodes this ADR admits are the answer to that: publisher permission is on file.
- **Touches:** [ADR 0013](0013-measure-the-rate-over-the-speech-span.md). Rates on
  ingested episodes are computed from ElevenLabs word timings — the same speech-span rule,
  measured off a transcript rather than off the audio file the publisher hosts.

## Context

The shipped episodes (7, 102, 103, 104, and the VOA lessons under `zh-Hant → en`) are
60–200 seconds each. Their audio is either the publisher's original MP3 checked in
byte-for-byte, or an excerpt loudness-normalised under CC BY-SA. Committing them was
cheap: the whole catalogue's audio is under 40 MB. Curating them was a per-episode
job: someone chose the 84-second span of 海山漁港, cut it, and defended the cut.

The next 24 are real podcast episodes. TeaTime-Chinese ep 93 is 22 minutes; 大人的
Small Talk runs 40–55; 電扶梯走左邊 is 60. Both properties of the shipped catalogue
break at that length. Committing the audio is 600+ MB of binary the repo does not
need; excerpting a 40-minute conversation is a curatorial act this ingest is
deliberately not attempting, because the point of shipping podcast episodes is that a
real podcast is what a real learner listens to.

## Decision

### 1. Full-length episodes only

The seed row for an ingested episode carries `durationSeconds` equal to the publisher's
`audio_duration_seconds` from `metadata.json`. No cuts, no fade-outs, no re-edits. The
transcript covers the whole episode; the cue list is 200–600 entries long depending on
duration and speaking rate. The `audioModified` field, which exists to record
CC BY-SA-relevant transformations, is not set — nothing was transformed.

### 2. Audio streams from the publisher's `audio_url`

`Episode.audioUrl` is the value from `metadata.json.audio_url` — a Libsyn or Firstory
URL the publisher's own podcast client is already hitting. The web player loads it
directly. Nothing is downloaded, proxied, or committed.

`audioSrc` (a repo-local path) stays supported for the earlier lesson episodes; the
loader prefers it when both are set. The two fields stay separate rather than
overloaded: a URL and a path have different failure modes and the type should not lie
about which the player is being handed.

### 3. `redistributable: true` on the seed row, permission held out of band

`redistributable: true` records that publisher permission is on file with the owner.
The older lesson episodes do not carry the field — their licences are per-field
(CC BY-SA, US-Gov public domain) and self-documenting inside the seed. The two
conventions mean different things: a licence in the seed is machine-checkable
provenance; `redistributable: true` is a claim the owner has made, and the seed records
the claim, not the paperwork. `sourceUrl` (from `page_url`) is always populated so the
claim is auditable to the publisher's page.

## Consequences we accept

**The player was built for ~90-second cue lists.** A 40-minute episode with 500 cues
will render but scroll poorly, and "jump to current cue" — unneeded for a lesson —
becomes essential. Virtualising the list and locking scroll to the current cue is a
separate design.

**Resume-from-position becomes required.** Nobody restarts a 40-minute podcast from
zero on every session. A per-learner store (localStorage first, then Postgres
alongside saved words per ADR 0011) has to arrive before the episodes are usable
enough to recommend. This ADR admits them anyway, because "cannot be resumed" is a
fixable problem and "only contains 90-second lessons" is a product problem.

**Remote URLs can rotate.** Libsyn `dest-id=…` tokens look stable, but a URL that
404s after ingest is a re-fetch, not a design bug. The fallback is to re-run the
ingest for that folder from a fresh feed pull. The seed does not pin a hash of the
audio; the hash of a file the repo does not host is not a check the repo can
perform.

**Auditability moves to the publisher.** With committed audio (VOA), a reader hashes
the file and verifies the seed. With remote audio, a reader clicks `sourceUrl` and
confirms the episode exists on the publisher's page. Which is which is recorded by
`audioSrc` versus `audioUrl`.

## Alternatives rejected

**Download and self-host.** Storage and bandwidth scale with the catalogue and do not
justify an S3 bill this stage cannot expense. The publisher's CDN is already paid for.

**Excerpt to 90-second clips.** A 90-second cut of a 40-minute interview is a lesson,
not an episode of that show. The excerpt format is fine — it is what the existing
episodes are — but it scales by curatorial work like the one that produced 海山漁港,
not by this ingest.

**Fetch and cache at build time.** Downloading during `next build` couples the deploy
to publisher uptime and burns their bandwidth on every deploy. The seed carries the
URL; the browser follows it; one fewer moving part than a build-time cache.
