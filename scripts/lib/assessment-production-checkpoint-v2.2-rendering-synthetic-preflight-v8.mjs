import {
  runCheckpointV22RenderingRemedyV6SyntheticViewport
} from "./assessment-production-checkpoint-v2.2-rendering-synthetic-preflight-v6.mjs";
import { assertV4 } from "./v4-lean-production.mjs";

function wrapTab(tab, surface, stats) {
  let cdpProxy = null;
  return {
    get playwright() {
      return tab.playwright;
    },
    get cua() {
      return tab.cua;
    },
    get dom_cua() {
      return tab.dom_cua;
    },
    get dev() {
      return tab.dev;
    },
    capabilities: {
      async get(name) {
        const capability = await tab.capabilities.get(name);
        if (name !== "cdp") return capability;
        if (!cdpProxy) {
          cdpProxy = {
            async send(method, parameters = {}) {
              stats.cdpCommands[surface][method] =
                (stats.cdpCommands[surface][method] ?? 0) + 1;
              const response = await capability.send(method, parameters);
              if (
                surface === "keyboard" &&
                method === "Runtime.evaluate" &&
                parameters.expression === "navigator.userAgent"
              ) {
                stats.keyboardUserAgent = response.result?.value ?? null;
              }
              return response;
            },
            readEvents(options) {
              return capability.readEvents(options);
            }
          };
        }
        return cdpProxy;
      }
    },
    async goto(url) {
      stats.navigationUrls[surface].push(url);
      await tab.goto(url);
    },
    async close() {
      await tab.close();
      stats.tabsClosed[surface] += 1;
    }
  };
}

function createHybridBrowser({
  pointerBrowser,
  keyboardBrowser,
  pointerControllerInput,
  keyboardControllerInput
}) {
  const stats = {
    viewportSetCalls: { pointer: 0, keyboard: 0 },
    tabRequests: { pointer: 0, keyboard: 0 },
    tabsClosed: { pointer: 0, keyboard: 0 },
    navigationUrls: { pointer: [], keyboard: [] },
    cdpCommands: { pointer: {}, keyboard: {} },
    keyboardUserAgent: null
  };
  let viewportSetIndex = 0;
  let tabIndex = 0;
  return {
    browser: {
      capabilities: {
        async get(name) {
          assertV4(name === "viewport", "v8 hybrid viewport capability required");
          return {
            async set() {
              viewportSetIndex += 1;
              if (viewportSetIndex === 1) {
                const controller = await pointerBrowser.capabilities.get("viewport");
                await controller.set(pointerControllerInput);
                stats.viewportSetCalls.pointer += 1;
                return;
              }
              assertV4(
                viewportSetIndex === 2,
                "v8 hybrid viewport may be set exactly twice"
              );
              const controller = await keyboardBrowser.capabilities.get("viewport");
              await controller.set(keyboardControllerInput);
              stats.viewportSetCalls.keyboard += 1;
            }
          };
        }
      },
      tabs: {
        async new() {
          tabIndex += 1;
          if (tabIndex === 1) {
            stats.tabRequests.pointer += 1;
            return wrapTab(await pointerBrowser.tabs.new(), "pointer", stats);
          }
          assertV4(tabIndex === 2, "v8 hybrid may request exactly two tabs");
          stats.tabRequests.keyboard += 1;
          return wrapTab(await keyboardBrowser.tabs.new(), "keyboard", stats);
        }
      }
    },
    snapshot() {
      assertV4(viewportSetIndex === 2, "v8 hybrid viewport phases incomplete");
      assertV4(tabIndex === 2, "v8 hybrid tab phases incomplete");
      return structuredClone(stats);
    }
  };
}

export async function runCheckpointV22RenderingRemedyV8SyntheticViewport({
  pointerBrowser,
  keyboardBrowser,
  fixtureBaseUrl,
  navigationToken,
  viewportName,
  viewport,
  timeoutMs = 15000
}) {
  assertV4(
    viewport?.pointerControllerInput && viewport?.keyboardControllerInput,
    "v8 hybrid controller inputs required"
  );
  const hybrid = createHybridBrowser({
    pointerBrowser,
    keyboardBrowser,
    pointerControllerInput: viewport.pointerControllerInput,
    keyboardControllerInput: viewport.keyboardControllerInput
  });
  const result = await runCheckpointV22RenderingRemedyV6SyntheticViewport({
    browser: hybrid.browser,
    fixtureBaseUrl,
    navigationToken,
    viewportName,
    viewport: {
      targetCssViewport: viewport.targetCssViewport,
      controllerInput: viewport.pointerControllerInput
    },
    timeoutMs
  });
  const target = viewport.targetCssViewport;
  const expectedPixels = {
    width: Math.round(target.width * result.devicePixelRatio),
    height: Math.round(target.height * result.devicePixelRatio)
  };
  const imageDimensionsPass = [result.collapsed, result.open].every(
    (image) =>
      image.pixelWidth === expectedPixels.width &&
      image.pixelHeight === expectedPixels.height
  );
  const transport = hybrid.snapshot();
  return {
    ...result,
    controllerInput: undefined,
    controllerInputs: {
      pointer: { ...viewport.pointerControllerInput },
      keyboard: { ...viewport.keyboardControllerInput }
    },
    expectedScreenshotPixels: expectedPixels,
    checks: {
      ...result.checks,
      screenshotDimensionsReconciled: imageDimensionsPass
    },
    browserTransport: {
      pointer: "Codex In-app Chromium browser",
      keyboard: "Google Chrome via ChatGPT browser extension",
      pointerUserAgent: result.userAgent,
      keyboardUserAgent: transport.keyboardUserAgent,
      ...transport,
      retryPerformed: false,
      timeoutExtended: false
    }
  };
}
