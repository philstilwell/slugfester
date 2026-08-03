# v2.8 development challenge attempt 1 assessment

Attempt 1 is frozen as failed development evidence. It does not authorize fresh held-out selection, numerical scoring, reconstructed scorecards, Overall Commentary, AI Extension, or production mutation.

## Preregistered result

- 49 retired development cases: 17 dyadic and 32 multi-speaker.
- Target-object exact agreement: 0.878 (required 0.90).
- Component-contact micro agreement: 0.928 (passed 0.90).
- Responsive-coverage exact agreement: 0.755; kappa 0.593 (required 0.85 and 0.75).
- Defect-type exact agreement: 0.796 (required 0.85).
- Diagnostic-object exact agreement: 0.536 (required 0.85).
- Impact-mode exact agreement: 0.857 (required 0.90).
- Derived-diagnostic exact agreement: 0.857 (required 0.90).
- Exact derived-tuple agreement: 0.633 (required 0.70).
- Burden exact agreement and kappa: 1.000 and 1.000.
- Six downstream disagreements were target-object cascades.

The challenge failed without lowering or changing any threshold.

## Root-cause audit

The failure has two separable causes.

1. The v2.8 target, operation, diagnostic-object, impact, and reframe boundaries still allowed non-deterministic readings. Operation-label agreement was only 0.722 even though contact agreement passed.
2. The hidden key inherited too many v2.7 adjudications without complete readjudication under the new v2.8 explicitness rules. An independent post-gate audit identified fourteen cases whose inherited object, burden, component, diagnostic, impact, or reframe labels probably conflict with the v2.8 manual. This made key accuracy an invalid proxy for v2.8 rule adherence in attempt 1.

The pass artifacts remain valid evidence about inter-pass instability. The inherited key must not be silently patched, and attempt 1 must not be recomputed against a post hoc key.

## Attempt-2 controls

Attempt 2 uses a new patch version and frozen artifacts. It must:

- independently readjudicate its key from the manual, quoted source excerpts, target packets, and burden packets without access to either attempt-1 pass;
- require exact evidence for connected examples, object changes, scope changes, burden changes, component contact, diagnostic cues, impact cues, reframes, and bridge contact;
- use complete fixed-length component records with explicit null operations;
- remove annotator-authored derived fields and derive disposition, substitution cause, coverage, diagnostic, reframe, and burden relation in code;
- distinguish canonical fixtures from cases retired as genuinely ambiguous under the prior rules;
- freeze the selection ledger, key, scripts, schemas, thresholds, and source hashes before either isolated pass; and
- keep all fresh held-out transcripts closed unless every attempt-2 development and executable-preflight gate passes.

