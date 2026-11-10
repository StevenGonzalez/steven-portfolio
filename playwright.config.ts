import { defineConfig, devices } from "@playwright/test";

// Runs the built site in Chrome: CHROME if it is set, otherwise the installed Google Chrome, so CI downloads no browser.
// yarn build first.
const port = 3100;

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    reducedMotion: "reduce",
    launchOptions: {
      ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: "chrome" }),
      args: process.env.CI ? ["--no-sandbox"] : [],
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `yarn -s next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
