# Slugfester Lean Structural Correction Benchmark v4.2.11

This retired benchmark repeats the correction task—not the primary judgment—for Debate 106 using a strictly smaller transport contract. The v4.2.7 correction took 7.34 minutes because it received and re-emitted the complete 75 KB judgment while also receiving the full ledger, packet, and scoring rubrics. None of those fields could be changed.

The v4.2.11 judge receives only the immutable routes, current sections, move IDs, sides, propositions, chronology, response targets, burden contacts, importance values, and deterministic violation report. It receives no transcript text, source excerpts, ratings, rating rationales, score, winner, legacy material, other correction output, or publication prose. It emits only four-to-six replacement section records and one section placement for every preserved move.

Repository code applies the proposed placements to the original score-blind candidate, preserves all other fields, and then runs the full v4.2.7 immutability validator, original complete-source validator, and compiler replay. One Sol/low attempt is permitted. The prior correction remains the historical result; this benchmark tests whether the lean contract can replace its runtime assumption for future structural corrections.

A pass authorizes recomputation of the correction-adjusted runtime projection. It does not authorize scores, Pass B, a fresh gate, production mutation, or the 195-debate run.
