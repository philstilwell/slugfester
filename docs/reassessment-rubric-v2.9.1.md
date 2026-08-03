# Slugfester Reassessment Rubric v2.9.1

This is the single-pass classification rubric for Workflow v2.9.1. It contains no performance scores.

## Decision order

1. Mark original-target contact only with exact language bearing on the locked claim or component.
2. Mark a connected example only when the response expressly links the new case to the target.
3. Classify scope: modality first, then narrower, stronger, or same.
4. Retain the burden unless the same demand is expressly transferred or a new governing success condition is expressly installed.
5. Mark every indispensable component contacted or not contacted; do not classify response posture.
6. Select an expressed defect and independently locate its stated consequence.
7. Require both clauses for reframe.
8. Select only the highest evidenced eligible burden tier.

## Contrastive anchors

- “Your claim that X fails because …” → target contact true.
- “Consider Y; this shows why X fails …” → target contact and connected example true.
- “Y is interesting” next to X → connected example false without the stated link.
- A move that ignores X and discusses Y → target contact false; code derives nonanswer. Do not invent a substitution category.
- “I am asking Y” → burden retained unless Y is expressly installed as the governing test.
- “The issue is not X because X conflates A and B; the relevant test is Y” → burden replaced and reframe true when both spans are exact.
- Granting, denying, qualifying, distinguishing, explaining, using, or attacking a component's warrant all count as component contact.
- “That premise is unsupported” → defect cue only; diagnostic false without a consequence.
- “That premise is unsupported, so the conclusion does not follow” → diagnostic true.
- “That is absurd” → no qualifying defect and no stated consequence.
- “Why Y?” → no reframe.
- “X is the wrong standard because …; use Y instead” → reframe.
- Supporting and attacking an eligible burden bridge are equally relevant; record only its highest tier.

## Output

Return schema primitives, exact evidence, and one unique content-grounded rationale per case. Do not enter derived labels, scores, rankings, Overall Commentary, AI Extension, or production edits.

