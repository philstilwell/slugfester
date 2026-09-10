# Temporary browser connection recovery

The first browser opened successfully, but a later restricted-environment connection could not reach its local control socket. The CLI's connection-error handler removes the socket path, leaving the owned daemon disconnected. This was confirmed by inspecting that handler and then checking the exact owned process identity outside the restriction.

The first replacement was opened before the original daemon had finished cleanup. Terminating the original removed the shared session registration, so that replacement could not be addressed either. Both exact, verified Debate 257 daemon processes (26863 and 27210) were terminated; no other browser process was targeted. A single fresh session (27274) was then opened after cleanup, and every subsequent browser operation used the same unrestricted local connection environment.

The original `desktop-capture.transport.log`, `desktop-capture.transport-2.log`, and `desktop-capture.transport-3.log` are preserved. They contain connection failures, not page-test results. The successful fourth collection is separately preserved as `desktop-capture.transport-4.log`; the capture destination did not exist until this successful attempt. The recorder gained an attempt-specific log name only, without changing any test or acceptance condition.

All actual desktop and phone content, layout, resource, interaction, reference-link, and discovery checks passed in the final session. Eleven screenshots were inspected. The final session was closed with the browser's own close operation, and the owned local preview server was stopped before the rendering audit was frozen. No source, judgment, publication prose, tag decision, or score changed during recovery; direct cost was $0.
