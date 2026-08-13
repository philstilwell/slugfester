import {
  runCheckpointV22RenderingRemedyV8SyntheticViewport
} from "./assessment-production-checkpoint-v2.2-rendering-synthetic-preflight-v8.mjs";
import {
  createCheckpointV22RenderingRemedyV9FreshKeyboardBrowser
} from "./assessment-production-checkpoint-v2.2-rendering-navigation-fresh-tab-v9.mjs";
import { assertV4 } from "./v4-lean-production.mjs";

export async function runCheckpointV22RenderingRemedyV9SyntheticViewport({
  keyboardBrowser,
  ...options
}) {
  const navigation =
    createCheckpointV22RenderingRemedyV9FreshKeyboardBrowser({
      browser: keyboardBrowser,
      timeoutMs: 15000
    });
  const result = await runCheckpointV22RenderingRemedyV8SyntheticViewport({
    ...options,
    keyboardBrowser: navigation.browser,
    timeoutMs: 15000
  });
  const stats = navigation.snapshot();
  assertV4(
    stats.tabRequests === 1 &&
      stats.tabsClosed === 1 &&
      stats.initialPageNavigateCalls === 1 &&
      stats.runtimeLocationAssignCalls === 1 &&
      stats.navigationUrls.length === 2,
    "remedy-v9 fresh keyboard navigation contract incomplete"
  );
  return {
    ...result,
    browserTransport: {
      ...result.browserTransport,
      keyboardNavigation: {
        ...stats,
        freshTabPerViewport: true,
        bootstrapMethod: "Page.navigate-once-per-fresh-keyboard-tab",
        measuredMethod:
          "Runtime.evaluate-location.assign-with-exact-url-readyState-poll",
        retryPerformed: false,
        timeoutExtended: false
      }
    }
  };
}
