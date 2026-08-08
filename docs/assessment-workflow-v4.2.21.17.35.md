# Slugfester Hard-Route Publication Stability Gate v4.2.21.17.35

Generate one isolated calibration-only public assessment for each of Debates 51, 63, 90, 153, and 165 after the adjudicated raw ledger and single deterministic score pass are locked. The model may author only the debate summary, representative quote selections and context, move summaries and critiques, post-scoring reference tags, Overall Commentary, and the separately disclosed AI Extension. Repository code owns and inserts all identity metadata, sides, chronology, sections, move IDs, timestamps, scores, and display structure.

The top-level debate summary must contain **18–28 words**. Every selected move appears exactly once. Every move summary contains 8–55 words. Every critique contains exactly four labeled sentences—`Strongest feature:`, `Principal limitation:`, `Live burden:`, and `Locked score:` in that order—contains 112–122 words as its generation target, and occupies 880–1,020 characters in the structured-output schema. The repository acceptance interval remains 105–130 words.

Representative quotations contain 3–18 words and must be exact strings from a high-confidence locked source span or from a span whose required audio verification already passed. Quote context contains 12–55 words. Tags are optional on moves; every Overall Commentary weakness must use only a genuinely applicable local reference.

Overall Commentary supplies three to six strengths and one to four weaknesses for each side. The AI Extension follows Overall Commentary, is explicitly identified as AI-generated, is visually distinct, and is default-collapsed in the compiled interface. It provides a strengthened final argument and two to four additional arguments per side, maps every item as extending, repairing, or introducing material, and includes at least one genuinely introduced new argument per side. It must not use “unassailable” or equivalent rational-invulnerability language. AI material is post-scoring and cannot affect participant scores.

## Stability thresholds

The gate retains one context per debate, one attempt per context, a one-context ramp, zero correction prompts, and maximum concurrency two. Based on the v17.34 observation of 18.71 wall minutes, 27.35 aggregate model-minutes, a 5.47-minute all-context mean, and one 9.23-minute valid outlier, the preregistered timing limits are 10 minutes per completed context and a 6.5-minute mean. The transport timeout is 12 minutes. These limits measure throughput; they do not alter any content or score rule.

This revision changes only the enforceable critique-length envelope and evidence-calibrated timing thresholds. The repaired structured-output subset, summary prompt, evidence, scoring closure, validator, model, reasoning effort, isolation, and no-retry policy remain unchanged.

