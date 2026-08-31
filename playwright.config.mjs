import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/site-quality",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  outputDir: ".playwright-results",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:4181",
    browserName: "chromium",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 }
  },
  webServer: {
    command: "python3 -m http.server 4181 --bind 127.0.0.1",
    url: "http://127.0.0.1:4181/",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe"
  }
});
