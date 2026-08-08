# Slugfester assessment workflow v4.2.21.17.40

## Purpose

This stage performs the deterministic final merge and compilation of the five-debate hard-route publication calibration. It consumes only model outputs already accepted by the v17.37, v17.38, and v17.39 gates. It launches no model context, authors no score, and does not mutate production debate data.

## Authorized sources

- Debates 51, 63, and 90 use their accepted v17.37 normalized publication outputs unchanged.
- Debate 153 uses its v17.37 output as the immutable base. Six accepted critique repairs come from v17.38; the two v17.38 critiques that exceeded the word boundary are excluded and superseded by the accepted v17.39 micro-repair.
- Debate 165 uses its v17.37 raw output as the immutable base. Only the accepted v17.38 exact con quotation is substituted.

## Deterministic merge contract

1. Verify that the v17.39 analysis explicitly authorizes `finalMerge`.
2. Hash every source packet, base output, repair output, and gate analysis used by the merge.
3. Require the Debate 153 repair keys to equal the eight preregistered fields exactly. Accept six fields from v17.38 and exactly the two superseding fields from v17.39.
4. Require the Debate 165 repaired quotation to be a 3–18 word exact substring of an eligible con source span.
5. Run deterministic quotation normalization where applicable.
6. Replay the complete v17.36 publication validator on every final output. This includes semantic structure, exact source quotations, four-sentence critique structure, 105–130 critique words, terminal punctuation, prohibited-language scanning, AI Extension disclosure, and exclusion of AI Extension material from scores.
7. Compile scores only from the previously locked calculated-score packets. No model-authored score field is permitted.
8. Write a source-to-output hash audit and a local-only rendering harness.

## Acceptance gate

The stage passes only if all five debates validate, all 100 locked moves appear exactly once, all 100 critiques pass prose integrity, all ten representative quotations are exact source substrings, all five compiled scorecards contain the exact byline and a distinct default-collapsed `AI Extension`, and zero production records are changed.

## Authorization boundary

A pass authorizes browser rendering verification of these five calibration previews. It does not authorize production mutation or the 195-debate run.
