# Slugfester Partition Primary A Failure Analysis v4.2.21.13.2

The frozen Primary A gate completed one valid context and two deterministic validation failures. All three proposals satisfied the new outer structure: five sections, weights totaling 100%, eight-to-twenty-four moves, and one-to-two moves from each side per section. The v4.2.12 section-shape failure is therefore resolved.

Debate 133 exposed an ownership error: score-blind chunk discovery labeled a candidate constructive, while the integrated judge treated it as responsive to an earlier selected move. Discovery has only local context and should not bind global move kind. Debate 182 set both `diagnosticConsequenceExplicit` and `replacementDemandAnswered` true, violating their mutual exclusion. The validator correctly rejected both outputs; no retry or repair was performed.

The successor retains the successful nested section structure. Primary A authors `moveKind` after reviewing the global candidate bundle. A single `specialResponseMode` enum—`none`, `diagnostic-defeat`, or `justified-reframe`—replaces the two incompatible booleans, which the repository expands only after validation. All three contexts must rerun fresh; the valid Debate 178 output is not reused.
