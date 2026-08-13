import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  runCheckpointV22RenderingRemedyV6Viewport
} from "./assessment-production-checkpoint-v2.2-rendering-browser-runner-v6.mjs";
import {
  createCheckpointV22RenderingRemedyV9FreshKeyboardBrowser
} from "./assessment-production-checkpoint-v2.2-rendering-navigation-fresh-tab-v9.mjs";
import {
  validateCheckpointV22RenderingRemedyV9ViewportEvidence
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs";
import { assertV4 } from "./v4-lean-production.mjs";

function wrapTab(tab, surface, stats) {
  let cdpProxy = null;
  return {
    get playwright() { return tab.playwright; },
    get dev() { return tab.dev; },
    capabilities: {
      async get(name) {
        const capability = await tab.capabilities.get(name);
        if (name !== "cdp") return capability;
        if (!cdpProxy) {
          cdpProxy = {
            async send(method, parameters = {}) {
              stats.cdpCommands[surface][method] =
                (stats.cdpCommands[surface][method] ?? 0) + 1;
              return capability.send(method, parameters);
            },
            readEvents(options) { return capability.readEvents(options); }
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

function createHybridBrowser({ pointerBrowser, keyboardBrowser, viewport }) {
  const stats = {
    navigationUrls: { pointer: [], keyboard: [] },
    cdpCommands: { pointer: {}, keyboard: {} },
    tabsClosed: { pointer: 0, keyboard: 0 }
  };
  let viewportIndex = 0;
  let tabIndex = 0;
  return {
    adapter: {
      capabilities: {
        async get(name) {
          assertV4(name === "viewport", "v9 viewport capability required");
          return {
            async set() {
              viewportIndex += 1;
              if (viewportIndex === 1) {
                const controller = await pointerBrowser.capabilities.get("viewport");
                await controller.set(viewport.pointerControllerInput);
                return;
              }
              assertV4(viewportIndex === 2, "v9 viewport phase overflow");
              const controller = await keyboardBrowser.capabilities.get("viewport");
              await controller.set(viewport.keyboardControllerInput);
            }
          };
        }
      },
      tabs: {
        async new() {
          tabIndex += 1;
          if (tabIndex === 1) {
            return wrapTab(await pointerBrowser.tabs.new(), "pointer", stats);
          }
          assertV4(tabIndex === 2, "v9 tab phase overflow");
          return wrapTab(await keyboardBrowser.tabs.new(), "keyboard", stats);
        }
      }
    },
    snapshot() {
      assertV4(viewportIndex === 2 && tabIndex === 2, "v9 phases incomplete");
      return structuredClone(stats);
    }
  };
}

export async function runCheckpointV22RenderingRemedyV9Viewport({
  pointerBrowser,
  keyboardBrowser,
  packet,
  viewportName,
  ...options
}) {
  const viewport = packet.viewports[viewportName];
  assertV4(viewport, `${packet.debateNumber}: unknown v9 viewport`);
  assertV4(options.timeoutMs === 15000, "v9 frozen timeout must be 15000ms");
  const navigation = createCheckpointV22RenderingRemedyV9FreshKeyboardBrowser({
    browser: keyboardBrowser,
    timeoutMs: 15000
  });
  const hybrid = createHybridBrowser({
    pointerBrowser,
    keyboardBrowser: navigation.browser,
    viewport
  });
  const v6CompatiblePacket = structuredClone(packet);
  v6CompatiblePacket.viewports[viewportName].controllerInput =
    viewport.expectedScreenshotPixels;
  v6CompatiblePacket.runnerPolicy.screenshotMethod =
    packet.runnerPolicy.pointerScreenshotMethod;
  const evidence = await runCheckpointV22RenderingRemedyV6Viewport({
    ...options,
    browser: hybrid.adapter,
    packet: v6CompatiblePacket,
    viewportName,
    browserName: "split-Chromium-fresh-keyboard-location-assign-transport"
  });
  const dimensionsPass = ["collapsed", "open"].every((name) => {
    const image = evidence.screenshots[name].transport;
    return image.pixelWidth === viewport.expectedScreenshotPixels.width &&
      image.pixelHeight === viewport.expectedScreenshotPixels.height;
  });
  evidence.schemaVersion =
    "1.0-production-checkpoint-v2.2-rendering-remedy-v9-viewport-evidence";
  evidence.viewport = {
    targetCssViewport: structuredClone(viewport.targetCssViewport),
    pointerControllerInput: structuredClone(viewport.pointerControllerInput),
    keyboardControllerInput: structuredClone(viewport.keyboardControllerInput),
    expectedDevicePixelRatio: viewport.expectedDevicePixelRatio,
    expectedScreenshotPixels: structuredClone(viewport.expectedScreenshotPixels)
  };
  evidence.checks.collapsedScreenshotDimensionsMatch = dimensionsPass;
  evidence.checks.openScreenshotDimensionsMatch = dimensionsPass;
  evidence.browser.pointerSurface = packet.runnerPolicy.pointerSurface;
  evidence.browser.keyboardSurface = packet.runnerPolicy.keyboardSurface;
  evidence.browser.transport = hybrid.snapshot();
  evidence.browser.keyboardNavigation = navigation.snapshot();
  evidence.status = Object.values(evidence.checks).every(Boolean) &&
    Object.values(evidence.runtime.counts).every((value) => value === 0) &&
    Object.values(evidence.mutations).every((value) => value === false)
    ? "passed-rendering-viewport"
    : "failed-rendering-viewport";
  const artifactPaths = [
    viewport.evidence.result,
    viewport.evidence.collapsedScreenshot,
    viewport.evidence.openScreenshot
  ].map((relative) => path.join(options.rootAbs, relative));
  try {
    validateCheckpointV22RenderingRemedyV9ViewportEvidence({
      packet,
      viewportName,
      activationNavigationToken: options.activationNavigationToken,
      evidence
    });
    await writeFile(artifactPaths[0], `${JSON.stringify(evidence, null, 2)}\n`);
  } catch (error) {
    await Promise.all(artifactPaths.map((file) => rm(file, { force: true })));
    throw error;
  }
  return evidence;
}
