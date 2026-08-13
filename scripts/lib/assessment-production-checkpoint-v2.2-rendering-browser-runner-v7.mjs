import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  extractCheckpointV22RenderingRemedyV6SignatureHex,
  runCheckpointV22RenderingRemedyV6Viewport
} from "./assessment-production-checkpoint-v2.2-rendering-browser-runner-v6.mjs";
import {
  createCheckpointV22RenderingRemedyV7NavigationSession
} from "./assessment-production-checkpoint-v2.2-rendering-navigation-session-v7.mjs";

export const extractCheckpointV22RenderingRemedyV7SignatureHex =
  extractCheckpointV22RenderingRemedyV6SignatureHex;
export { createCheckpointV22RenderingRemedyV7NavigationSession };

export async function runCheckpointV22RenderingRemedyV7Viewport({
  navigationSession,
  ...options
}) {
  const before = navigationSession.beginViewport();
  const evidence = await runCheckpointV22RenderingRemedyV6Viewport({
    ...options,
    browser: navigationSession.browser
  });
  const after = navigationSession.snapshot();
  evidence.schemaVersion =
    "1.0-production-checkpoint-v2.2-rendering-remedy-v7-viewport-evidence";
  evidence.navigationTransport = {
    bootstrapInitialMethod:
      "Page.navigate-once-per-persistent-serial-tab",
    subsequentMethod:
      "CDP-Runtime.evaluate-location.assign-with-exact-url-readyState-poll",
    pageNavigateCallsThisViewport:
      after.initialPageNavigateCalls - before.initialPageNavigateCalls,
    runtimeLocationAssignCallsThisViewport:
      after.runtimeLocationAssignCalls - before.runtimeLocationAssignCalls,
    cumulativePageNavigateCalls: after.initialPageNavigateCalls,
    cumulativeRuntimeLocationAssignCalls: after.runtimeLocationAssignCalls,
    actualDomainEnableCalls: after.actualDomainEnableCalls,
    memoizedDomainEnableCalls: after.memoizedDomainEnableCalls,
    persistentPhaseTabs: 1,
    pointerKeyboardIsolation: "fresh-tokenized-documents-in-serial-tab",
    freshTokenizedDocumentsPerViewport: 4,
    retryPerformed: false,
    timeoutExtended: false
  };
  if (evidence.status === "passed-rendering-viewport") {
    const resultPath = path.join(
      options.rootAbs,
      options.packet.viewports[options.viewportName].evidence.result
    );
    await writeFile(resultPath, `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return evidence;
}
