# v4.1.5 triggered Pass B retired-gate assessment

Status: **failed**.

The preregistered three-context Pass B execution ran once in the fixed order 55, 103, 161 with no workflow retries. Debates 55 and 103 returned valid exact-schema artifacts in 10.70 and 8.18 minutes. Their 24 combined locked moves passed deterministic response, burden-reference, charity, adjustment, order, coverage, and calculated-field checks, with no medium- or low-confidence speaker attribution requiring audio verification.

Debate 161 recorded one recoverable stream-disconnection event during source review but did not finish before the frozen 20-minute invocation cap. The runner terminated that context with `SIGTERM`, wrote no Debate 161 output, marked the gate failed, and left disagreement extraction, adjudication, score derivation, and production mutation unauthorized. Total elapsed compute was 38.87 minutes; the mean across all attempted contexts, including the timeout, was 12.96 minutes.

The failure is operational rather than a validated semantic disagreement: Debate 161 produced no artifact that could be judged. No replay, output repair, normalization, or continuation of the failed context is authorized. A future attempt requires a prospective protocol amendment and a newly frozen gate.

The principal workflow implication is that the inherited eight-minute Pass B planning assumption and 20-minute cap are not robust to the longest transcripts plus a recoverable transport interruption. Any successor must preserve full-transcript access and hash-locked source provenance while reducing redundant event-file reading, increasing the bounded timeout, and recalculating the corpus projection from measured live Pass B time.
