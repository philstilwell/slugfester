import {
  runCheckpointV22RenderingRemedyV6SyntheticViewport
} from "./assessment-production-checkpoint-v2.2-rendering-synthetic-preflight-v6.mjs";
import {
  createCheckpointV22RenderingRemedyV7NavigationSession
} from "./assessment-production-checkpoint-v2.2-rendering-navigation-session-v7.mjs";

export { createCheckpointV22RenderingRemedyV7NavigationSession };

export async function runCheckpointV22RenderingRemedyV7SyntheticViewport({
  navigationSession,
  ...options
}) {
  const before = navigationSession.beginViewport();
  const result = await runCheckpointV22RenderingRemedyV6SyntheticViewport({
    ...options,
    browser: navigationSession.browser
  });
  const after = navigationSession.snapshot();
  return {
    ...result,
    navigationTransport: {
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
    }
  };
}
