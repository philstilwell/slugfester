# Slugfester Hard-Route Publication Normalization Gate v4.2.21.17.37

This gate retains the complete v17.36 publication integrity contract: isolated calibration-only authoring for Debates 51, 63, 90, 153, and 165; repository-owned identity, structure, chronology, and scores; an 18–28-word summary; every locked move exactly once; four complete labeled critique sentences; a 112–122-word critique target; at least 880 critique characters; terminal punctuation; no unexpected CJK or Hangul artifacts; exact local references; balanced Overall Commentary; and a clearly disclosed, score-excluded, visually distinct, default-collapsed AI Extension after Overall Commentary.

Representative quote generation now targets **6–14 words**, safely inside the repository acceptance interval of 3–18 words. A quote must remain an exact substring of an eligible locked source span.

## Deterministic quote normalization

If—and only if—a model-selected quote is an exact eligible source substring but exceeds 18 words, repository code keeps the final 18 contiguous whitespace-delimited words of that selected quote. The normalized quote must remain an exact substring of both the model-selected quote and its locked source span. Quotes shorter than three words, non-exact quotes, and all other quote defects fail validation. Raw model output and normalized output are stored separately with hashes and a field-level transformation audit. This is mechanical source selection, not model correction, scoring, or prose authorship.

The gate uses one context per debate, one attempt per context, a one-context ramp, zero model retries or correction prompts, maximum concurrency two, a 10-minute per-context limit, a 6.5-minute mean limit, and a 12-minute transport timeout.

