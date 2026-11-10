import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { insights, projects } from "@/lib/content";

const PAGES = [
  "/",
  "/projects",
  ...projects.map((project) => `/projects/${project.slug}`),
  "/insights",
  ...insights.map((post) => `/insights/${post.slug}`),
  "/resume",
];

/** Collects the page's errors from here on. The Speed Insights script exists only on Vercel, so its absence is no fault. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const about = `${message.text()} ${message.location().url}`;
    if (message.type() === "error" && !about.includes("/_vercel/")) errors.push(message.text());
  });
  return errors;
}

for (const path of PAGES) {
  test(`${path} loads without errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`${path} has no accessibility violations in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(path);
      // Legacy mode runs axe inside this page. Otherwise axe opens a blank tab to finish in, and in Firefox that new tab
      // sometimes never answers (about 1 run in 80 on two cores). The site has no iframes for legacy mode to miss.
      const { violations } = await new AxeBuilder({ page })
        .setLegacyMode()
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.target}`)).toEqual([]);
    });
  }
}

test("an unknown page is a 404 with a way home", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.locator(".wordmark")).toHaveAttribute("href", "/");
});

test("the first Tab lands on the skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveClass(/skip/);
});

test("the world draws into its canvases", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.locator(".hero canvas").count()).toBeGreaterThan(5);
});

test("a project card opens its case study", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("link", { name: projects[0].title, exact: true }).click();
  await expect(page).toHaveURL(`/projects/${projects[0].slug}`);
  await expect(page.locator("h1")).toHaveText(projects[0].title);
});

test("the header links to the résumé, and the résumé to a real PDF", async ({ page, request }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "Résumé" }).click();
  await expect(page).toHaveURL("/resume");
  const href = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  const pdf = await request.get(href!);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("the feed lists every article", async ({ request }) => {
  const feed = await request.get("/feed.xml");
  expect(feed.headers()["content-type"]).toContain("application/rss+xml");
  expect((await feed.text()).match(/<item>/g)).toHaveLength(insights.length);
});

test("the home page describes its owner to search engines", async ({ page }) => {
  await page.goto("/");
  const person = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(person["@type"]).toBe("Person");
  expect(person.sameAs.length).toBeGreaterThan(0);
});
