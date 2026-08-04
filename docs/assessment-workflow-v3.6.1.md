# Slugfester Targeted Decision-Card Workflow v3.6.1

Version 3.6.1 is the corrective fixture stage for v3.6. It preserves the four decision-card schemas, semantic rules, relation-link rules, candidate-bound burden policy, and all scoring exclusions.

The only change concerns a frozen evidence span whose text occurs more than once. A development-fixture normalizer may expand such a span to the shortest unique word-boundary context that contains the originally adjudicated occurrence. The expansion must be no longer than 160 characters, must preserve the original text at its original location, and is chosen deterministically by shortest length, then smallest added context, then earliest start and end. Failure to find a qualifying window stops the fixture gate.

This is not permission to guess an occurrence. Future model cards still return exact text without offsets, and they must include enough surrounding context for that text to occur exactly once. The compiler derives offsets and rejects ambiguity.

The v3.6 fixture thresholds remain unchanged. A pass authorizes only preregistration of one remote structured-output smoke test on a gold-free synthetic packet. It does not authorize a model batch, held-out access, scoring, assessment prose, or production mutation.
