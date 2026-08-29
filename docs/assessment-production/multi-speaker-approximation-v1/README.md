# Multi-speaker approximation v1

This directory contains the frozen source census and executable local contracts for reassessing the 16 team and panel debates that the dyadic production campaign excluded.

The process is intentionally approximate. It retains the ordinary six v2 dimensions, two isolated judgments, dispute-only adjudication, audio escalation, one repository score pass, and publication checks. It simplifies the unreliable v2.7 semantic classifications and keeps argument credit attached to the actual speaker.

Run:

```sh
npm run assessment:multi-speaker:v1:build
npm run assessment:multi-speaker:v1:check
```

The build command reconstructs `manifest.json` from identity-only debate metadata and the ignored local caption cache. The check command replays every source hash and the scorer's synthetic contract tests without reading or changing legacy scores.

No model call, paid transcription, score, publication prose, production mutation, or ranking change is authorized merely by this preparation record.
