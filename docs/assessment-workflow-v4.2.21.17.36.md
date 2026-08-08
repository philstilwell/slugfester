# Slugfester Hard-Route Publication Integrity Gate v4.2.21.17.36

Generate one isolated calibration-only public assessment for each of Debates 51, 63, 90, 153, and 165 after the adjudicated raw ledger and single deterministic score pass are locked. The model may author only the debate summary, representative quote selections and context, move summaries and critiques, post-scoring reference tags, Overall Commentary, and the separately disclosed AI Extension. Repository code owns and inserts all identity metadata, sides, chronology, sections, move IDs, timestamps, scores, and display structure.

The top-level debate summary must contain **18–28 words**. Every selected move appears exactly once. Every move summary contains 8–55 words. Every critique contains exactly four complete labeled sentences—`Strongest feature:`, `Principal limitation:`, `Live burden:`, and `Locked score:` in that order—contains 112–122 words as its generation target, contains at least 880 characters, and ends with terminal punctuation. The repository acceptance interval remains 105–130 words. There is no structured maximum character length: do not truncate a sentence or word to fit an artificial boundary. Critiques must not contain unexpected CJK or Hangul script artifacts.

Representative quotations contain 3–18 words and must be exact strings from a high-confidence locked source span or from a span whose required audio verification already passed. Quote context contains 12–55 words. Tags are optional on moves; every Overall Commentary weakness must use only a genuinely applicable local reference.

Overall Commentary supplies three to six strengths and one to four weaknesses for each side. The AI Extension follows Overall Commentary, is explicitly identified as AI-generated, is visually distinct, and is default-collapsed in the compiled interface. It provides a strengthened final argument and two to four additional arguments per side, maps every item as extending, repairing, or introducing material, and includes at least one genuinely introduced new argument per side. It must not use “unassailable” or equivalent rational-invulnerability language. AI material is post-scoring and cannot affect participant scores.

The gate uses one context per debate, one attempt per context, a one-context ramp, zero correction prompts, maximum concurrency two, a 10-minute per-context limit, a 6.5-minute mean limit, and a 12-minute transport timeout.

This revision removes the 1,020-character schema maximum that caused three exact-bound, unterminated critiques in v17.35. It adds independent terminal-punctuation and unexpected-script validation while retaining the 880-character minimum, word-count rule, evidence, scoring closure, model, reasoning effort, isolation, and no-retry policy.

