# v3.8.8 recovered diagnostic reconstruction

This phase tests the prose, AI Extension, and rendering tail of the retired three-debate workflow after the v3.8.8 consensus ledger and mechanically derived scores validated. It is calibration-only and does not mutate production debate data.

## Governance status

This is not a clean continuation of the v3.8.4 gate. The original six scoring contexts failed one semantic representation rule, and their preserved judgments required a separately audited post-hoc normalization before they could validate. Required medium-confidence audio verification also incurred an estimated $0.09069525 in approved transcription cost. Those events already prevent a clean v3.8.4 gate pass. Completing this recovered diagnostic phase can reveal whether the downstream reconstruction and rendering design works, but it cannot authorize the ten-debate gate or the 195-debate rollout.

## Locked inputs

- the validated v3.8.8 final performance ledger;
- the independently validated mechanically calculated scores;
- the three locked performance packets and their local full transcript, event, and caption-manifest chains;
- six preselected representative quotations, one per participant, each checked against source audio;
- Slugfester End-to-End Consensus Workflow v3.8.4, Slugfester Reassessment Rubric v3.8.4, the v3.8.4 reconstruction contract, this manual, and the closed per-debate schemas.

Legacy scores, critiques, tags, Overall Commentary, AI Extension material, rankings, and winner labels remain prohibited model inputs.

## Execution

One fresh isolated 5.6 Sol context reconstructs each debate. Each context uses ChatGPT subscription authentication with API keys removed, high reasoning effort, no retries by default, and a closed output schema. It receives its locked packet, final ledger slice, calculated score slice, quote-verification slice, full transcript, event data, source manifest, workflow, rubric, and reconstruction manual.

The model must copy scores, section identities, participant identities, and verified quote text. It may select representative final-ledger moves for display, but may not invent participant claims or use AI-added material to improve a participant score. It drafts critiques, Overall Commentary, optional post-scoring tags, and the separately disclosed AI Extension.

## Diagnostic acceptance criteria

- 3/3 fresh contexts finish without retry, contamination, or model-supplied score changes;
- every displayed move maps to the correct final-ledger speaker, side, section, timestamp, and score;
- every section and overall score exactly matches the calculator output;
- displayed argument summaries contain 8–55 words and critiques contain 105–130 words;
- each side has at least three concrete `Landed` items and at least one material `Whiffed` item;
- all six representative quotations exactly match both the locked caption excerpt and an audio-derived transcript;
- `AI Extension` is immediately after Overall Commentary, default-collapsed, visually distinct, and explicitly identified as AI-generated rather than transcript content;
- each side has a thesis, 4–6 premises, a proportionate conclusion, and 2–4 new reinforcing arguments of 45–130 words;
- every AI Extension thesis, premise, conclusion, and new argument has an `extends`, `repairs`, or `introduces` novelty record; introduced items have no source move IDs;
- the exact byline is `Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.`;
- the prohibited term and rational-invulnerability scan has zero hits;
- calibration previews pass desktop, mobile, default-closed, open, keyboard-focus, and reduced-motion checks through the production rendering component;
- model metered API cost is $0; the single additional representative-quote transcription remains at or below the announced $0.01 cap.

Failure is preserved and reported. No retry, repair pass, production mutation, ten-debate gate, or corpus rollout is automatically authorized.
