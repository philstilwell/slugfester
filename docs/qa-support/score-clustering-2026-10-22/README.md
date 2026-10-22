# Could score clustering arise from arbitrary assignment?

Analysis: October 22, 2026. Source: the frozen October 9, 2026 research snapshot. This is a new, retrospective consistency check, not a reassessment of any debate.

## Question and population

Do the same people's scores cluster more tightly than they would if each debate's two awarded scores were assigned at random to its two participants?

Use the ranking study's 291 eligible, locked one-on-one debates (291 distinct recordings). Include every interlocutor with at least six appearances: 31 people and 314 appearances. The threshold follows the existing split-half study and depends only on appearance count, not on score or outcome. The result describes the group collectively, not every person's scores separately.

## Random-assignment model

For each debate independently, use a fair coin to retain or swap its two scores. Repeat this across the archive 100,000 times. The actual participants, matchups, recording, topic, assessment procedure, two awarded scores and their sum stay attached to each debate. Each person's number of appearances and mix of procedures remain fixed. Debates with no included participant cannot affect the statistic; they remain in the randomization for reproducibility.

This keeps the dependence between opponents' scores within a debate. It tests the specific assumption that, conditional on those two awarded scores and that matchup, either participant is equally likely to receive either score. It does not test every conceivable form of arbitrary scoring. For example, systematic preferences for a position or a speaker can violate this assumption without accurate assessment.

## How clustering is measured

For each person, subtract that person's mean from each recorded score and square the differences. Add them across the 314 appearances, divide by 314 − 31, and take the square root. This is the pooled within-person standard deviation, expressed in score points. Lower values mean tighter clustering. People with more appearances contribute more observations. No score values are changed in the published archive.

## Results

- Observed pooled spread: **3.069 points**.
- Typical spread after random assignment: **4.871 points**.
- Middle 95% of simulated spreads: **4.599–5.113 points**. This is a range of random-assignment outcomes, not an accuracy interval.
- Simulations with spread at or below the observed value: **0 of 100,000**.
- Conventional plus-one permutation p-value: **1/100,001**, approximately 0.00001. Adding one to both numerator and denominator avoids reporting zero from a finite simulation; see the [SciPy permutation-test documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html).
- With zero qualifying simulations, the one-sided 95% binomial upper bound for the underlying tail probability is `1 − 0.05^(1/100000) = 0.000029956874`, approximately **0.003%**, or **1 in 33,381**. The Q&A rounds conservatively to about **1 in 33,000**.

The upper bound quantifies simulation uncertainty under the stated model. It is not the probability that the model is true, the probability that the site is wrong, or a confidence interval for assessment accuracy. Zero observed successes does not imply an impossible event. No stronger tail precision is claimed.

## Interpretation and limits

The observed pattern is difficult to reconcile with this random within-debate assignment model. That supports a repeatable relationship between participants and their recorded scores. It does not identify the cause: reasoning quality, recurring topics or roles, speaker recognition, consistent bias and shared assumptions can contribute. The catalogue is curated and historical procedures differ. The test does not establish that all historical reviews were blind, validate individual interpretations, predict future debates, or settle a worldview. It reuses the existing archive and is not an independent replication of the ranking study.

This hypothesis was examined after the clustering had been noticed. Treat it as an exploratory check. No alternative sample thresholds or statistics were searched to obtain the reported result.

## Evidence and reproduction

- [Frozen input](../../analysis/corpus-papers-2026-10-09/debates.json)
- [Complete numerical results and participant counts](results.json)
- [Calculation script](../../../scripts/analyze-score-clustering.mjs)
- [Independent Python verification](verify.py)
- [Calculation fixtures and source checks](../../../tests/score-clustering.test.mjs)

The results record the input's SHA-256 fingerprint. The main calculation uses seed 20261022; the independent Python check uses a different generator and seed 20261023. That check reproduces the observed statistic with weighted sample variances and finds zero qualifying cases in a separate 10,000 draws. Those extra draws are not pooled into the published 100,000-draw result.

From the repository root:

```
node scripts/analyze-score-clustering.mjs --check
node --test tests/score-clustering.test.mjs
python3 docs/qa-support/score-clustering-2026-10-22/verify.py
```
