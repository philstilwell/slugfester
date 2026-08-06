# Slugfester Known-Speaker Reference Closure v4.2.21.3.1

The v4.2.21.3 audio stage made five requests that the API rejected with HTTP 400 before producing any transcript. Both known-speaker references were 12 seconds, exceeding the endpoint's accepted 1.2–10.0-second range. The failed execution, unresolved audit, and unknown actual billing state remain preserved.

v4.2.21.3.1 is a distinct recovery. It extracts new eight-second references for Frank Turek and Alex O'Connor from high-confidence, uninterrupted spans in the same locally saved source audio. The repository measures each encoded reference with `ffprobe` and rejects it before manifest creation unless the actual duration is within 1.2–10.0 seconds.

The five original debate clips, verification excerpts, expected speakers, deterministic thresholds, diarization model, local-output requirement, and no-retry rule remain unchanged. The first call functions as an endpoint-validity check: a request-level failure stops the remaining four calls rather than multiplying a common failure. A completed but deterministically unresolved transcript does not stop later independent calls and receives no automatic correction.

The new workload is 4.8446 minutes at the official $0.006-per-minute estimate, or $0.0291 expected and $0.04 maximum. ChatGPT subscription billing does not cover this API work. Because billing for the five rejected v4.2.21.3 requests is not known locally, the conservative cumulative ceiling is $0.08.

No adjudication packet, adjudication model context, ledger, score, winner, publication prose, production change, or 195-debate run is authorized until all five required moves pass audio verification.
