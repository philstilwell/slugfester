# Multi-speaker approximation v1

This directory contains the frozen source census and executable local contracts for reassessing the 16 team and panel debates that the dyadic production campaign excluded.

The process is intentionally approximate. It retains the ordinary six v2 dimensions, two isolated judgments, dispute-only adjudication, one repository score pass, and publication checks. It simplifies the unreliable v2.7 semantic classifications and keeps argument credit attached to the actual speaker.

Before scoring, every debate now requires a format-fitness record and an independent score-blind audit of the complete move inventory. Every selected move, speaker handoff, cross-talk passage, and quote-eligible span requires audio verification. Repository code reports the two primary score ranges, equal-active-speaker and leave-one-speaker-out sensitivity results, and a deterministic checkpoint decision. Multi-speaker scorecards are excluded from individual interlocutor rankings.

Run:

```sh
npm run assessment:multi-speaker:v1:build
npm run assessment:multi-speaker:v1:check
```

The build command reconstructs `manifest.json` from identity-only debate metadata and the ignored local caption cache. The check command replays every source hash and the scorer's synthetic contract tests without reading or changing legacy scores.

After checkpoint execution, call `buildMultiSpeakerCheckpointReliabilityReport` from `scripts/lib/assessment-production-multi-speaker-approximation-v1.mjs` with Debates 71, 84, and 154 in that order. A leading-side change in any sensitivity diagnostic produces `hold-for-review`; the report never triggers an automatic rerun.

No model call, paid transcription, score, publication prose, production mutation, or ranking change is authorized merely by this preparation record.
