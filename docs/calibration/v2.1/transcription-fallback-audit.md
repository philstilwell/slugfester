# v2.1 Transcript Acquisition Audit

Audit date: 2026-08-02

The local corpus now contains a timestamped transcript, normalized event file, and source manifest for all 195 published debates. Full transcript text and raw audio/API output remain in ignored local storage. `docs/calibration/v2.1/corpus-transcript-audit.json` commits paths, counts, provenance, and SHA-256 hashes without committing the transcript corpus.

## Coverage

- Public YouTube captions: 192 debates
- Paid OpenAI transcription from verified public audio: 3 debates
- Missing local transcripts: 0
- Strict local hash checks passed: 195 of 195

The paid fallbacks are:

1. Debate #13, `knechtle-oconnor-christian-morality-2025`: the deleted 51:06 YouTube excerpt was matched to the publisher's public Within Reason RSS audio by title, duration, and identical opening dialogue. The exact opening excerpt was transcribed with `whisper-1` into 926 timestamped segments.
2. Debate #58, `dillahunty-slick-secular-humanism-christianity-2016`: the accessible YouTube source exposes neither manual nor automatic captions. Its locally saved audio was divided into nine 20-minute files and transcribed with `whisper-1` into 3,541 timestamped segments.
3. Debate #167, `craig-shook-existence-god-2008`: a public participant-labeled MP3 was transcribed in seven chunks with `gpt-4o-transcribe-diarize` into 1,887 timestamped speaker segments. Speaker letters reset independently within each chunk and therefore require debate-level attribution review.

## Cost and retry note

Successful API work is estimated at approximately $4.17: about $2.88 for diarization, $0.31 for Debate #13, and $0.98 for Debate #58. One whole-file Whisper request for Debate #58 timed out after automatic retries and returned no transcript. If OpenAI bills every server-side retry despite the timeout, the conservative ceiling is approximately $7.11. The segmented replacement completed successfully.

## Acquisition dependency safety

Debate #58 audio was obtained with an already-installed `yt-dlp` 2026.03.17 and the official `yt-dlp/ejs` 0.8.0 solver asset; no repository or package was installed for this acquisition. Before enabling the remote solver, the user's NVIDIA SkillSpector fork was run against the solver repository and exact release asset. Repository-level heuristics produced broad build/CI false positives. The exact minified asset scored medium/caution, with findings limited to license text and numeric lookup tables; manual inspection of the unminified asset found no process, filesystem, network-request, dynamic-evaluation, or child-process primitives. The minified asset SHA-256 was `c55987fe697e5b9ee18830163f7af85327e9bb5c3e674b969d38c8d205eaa577`.

## Operational policy

1. Prefer the canonical local cache and public captions.
2. If captions are absent, verify a public audio source and record its URL.
3. Estimate cost and obtain approval before paid calls.
4. Use timestamped Whisper as the default fallback. Use diarization only when speaker separation materially improves attribution.
5. Segment paid audio at 20 minutes or less before submission; never rely on one multi-hour request.
6. Preserve raw API JSON locally, normalize absolute timestamps, and write hashes/counts into the manifest.
7. Fail closed: `npm run assessment:transcripts:check` must pass before inventory or scoring begins.
8. Audio-check every representative quote and every selected move with medium or low attribution confidence before a scorecard is promoted.
