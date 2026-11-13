import { defineConfig, devices } from "@playwright/test";

// Runs the built site, so yarn build first. yarn test:site uses Chrome: CHROME if it is set, otherwise the installed
// Google Chrome. yarn test:engines uses Playwright's own Firefox and WebKit, which yarn playwright install fetches.
// It runs one page at a time. Each page draws the world in software, and with two side by side on a CI runner, one
// starved the other so badly that WebKit took 5 to 8 seconds to show a button it shows in under one on its own.
const port = 3100;
const chrome = {
  launchOptions: {
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: "chrome" }),
    args: process.env.CI ? ["--no-sandbox"] : [],
  },
};
const desktop = { width: 1440, height: 900 };

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop", use: { ...chrome, viewport: desktop } },
    { name: "phone", use: { ...chrome, ...devices["Pixel 7"] } },
    { name: "firefox", use: { browserName: "firefox", viewport: desktop } },
    { name: "webkit", use: { browserName: "webkit", viewport: desktop } },
  ],
  webServer: {
    command: `yarn -s next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
