# Slugfester Single Deterministic Score Pass v4.2.21.17.7

After all three adjudicated raw ledgers are hash-locked and source-validated, the repository runs the established scoring formula exactly once. No model calculates a score. The same pass derives diagnostic A, B, and final scores so post-adjudication stability can be tested without exposing scores upstream.

The prospective stability gate requires preservation of every winner on which A and B agreed, mean absolute final-to-initial distance no greater than four points, maximum distance from either initial pass no greater than eight points, and maximum movement outside the initial A/B range no greater than three points. Existing production scores are diagnostic only and cannot affect acceptance.
