# Slugfester Chronology-First Compact Workflow v4.2.2

This development revision responds only to the v4.2.1 chronology cross-reference failure. It retains the v4.2 compact transport, the v4.0 through v4.1 judgment anchors, repository-owned timestamps, source-span validation, one-attempt rule, no-normalization rule, and all score and legacy boundaries.

## Chronology-first output contract

The primary judge emits section metadata separately from one top-level `moves` array. The array must be ordered by `sourceSpan.startEvent`, then `endEvent`, then `moveId`. Every move carries its `sectionId` and `side`; every section still requires one or two selected moves per side. A reply may name only a target move ID already emitted above it.

Repository validation independently sorts and checks source chronology, verifies that every target exists and is earlier, then converts the chronology-first inventory into the inherited v4.2.1 representation for every remaining judgment and source-integrity check. Automatic retargeting, reordering, output normalization, and post hoc repair remain prohibited.

## Retired diagnostic

Debate 07 is retired from fresh-gate use and is the sole v4.2.2 model diagnostic. The original local transcript, events, manifest, and lossless compact source ledger remain hash-locked. The model receives only the complete rubric set, one consolidated v4.2.2 manual, the source packet, schema, and compact ledger. It does not receive the failed v4.2.1 output or failure analysis.

One isolated 5.6 Sol/low context receives one attempt, no retry, and a 30-minute limit through ChatGPT subscription authentication with API keys removed. The test passes only if the endpoint output and all deterministic inherited validators pass unchanged, repository timestamps compile, and compilation replays exactly.

A pass authorizes preparation—but not execution—of a new disjoint fresh-six gate using the chronology-first contract. A failure is preserved unchanged and stops development. No scores, winners, legacy comparisons, publication prose, AI Extension content, production mutation, or 195-debate execution are authorized here.
