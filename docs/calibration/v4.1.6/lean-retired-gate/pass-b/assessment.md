# v4.1.6 triggered Pass B retired-gate assessment

Status: **execution and compute passed; required audio verification pending**.

All three preregistered 5.6 Sol/high contexts returned valid v4.1.6 artifacts on their only authorized attempts. The fixed order was 55, 103, 161; all 34 locked moves and 15 sections passed exact-schema, order, coverage, response-tuple, burden-reference, charity, adjustment, and calculated-field validation. There were no workflow retries, model replays, output repairs, normalization steps, or recoverable transport events.

The contexts completed in 7.10, 8.44, and 7.50 minutes, for 23.04 aggregate minutes and a 7.68-minute mean. This is faster and more robust than the failed v4.1.5 gate. Using the measured mean yields a 40.22-hour central projection and a 54.78-hour conservative projection for 195 debates, including the five-hour audio/QA/rendering allowance and separate two-hour transport contingency. Both compute gates pass.

Eight moves received medium speaker-attribution confidence because their locked spans contain a moderator or opponent at a boundary even though the proposition-bearing voice is textually identifiable. The affected counts are three moves in Debate 55, four in Debate 103, and one in Debate 161. The workflow therefore blocks disagreement extraction until all eight are verified against audio.

The complete source audio from the prior retired-gate audit remains stored locally and hash-verifiable. No new media acquisition is needed. Known-speaker diarization of the eight extracted boundary clips is separately cost-capped before execution; no audio result is presumed in this assessment.
