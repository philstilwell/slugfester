# v2.9 attempt-1 failure assessment

Attempt 1 failed during key-construction preflight, before a key, manifest, blind pass, reliability analysis, held-out selection, or numerical score existed.

The first fresh 5.6 Sol candidate context did not complete an artifact. The second independently annotated all 25 cases and found 24 original-target contacts, 7 connected examples, 43 component contacts, 12 defect candidates, 8 diagnostics, and 24 burden contacts. It found only one genuine exclusive substitution and one genuine two-clause reframe. The validator had preregistered floors of three for both. The remaining context was stopped after that failure rather than invited to change semantic judgments to satisfy counts.

This is useful evidence about the contract:

- `exclusiveObjectSubstitution` is not needed to score responsiveness. A move with no original-target or component contact already derives `nonanswer`; burden replacement and reframe fields capture redirection when it is expressly justified. Retaining a separate rare substitution label violates the v2.9 design rule that gated distinctions must affect a score.
- The stricter two-clause reframe rule is behaving as intended. Several v2.8 positives were ordinary answers, distinctions, or redirections rather than genuine reframes. The measured challenge needs additional retired, explicit positive fixtures instead of a lower definition or forced relabeling.
- Non-degeneracy floors must be justified by a pre-pass fixture inventory under the exact current semantics. Counts carried from an older semantic contract are not valid evidence that the new contract contains the same positives.

v2.9.1 will remove exclusive substitution from the annotation and reliability gate, preserve target noncontact as `unaddressed`, and add two retired real excerpts with explicit defect-and-replacement language. All other scoring-relevant simplifications remain. No API or transcription charge was incurred; the contexts used the ChatGPT/Codex subscription path with `OPENAI_API_KEY` removed.
