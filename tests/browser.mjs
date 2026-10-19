// A real Chromium extension context, with intercepted YouTube HTML fixtures.
// This tests our DOM behavior; it does not establish compatibility with every
// live YouTube experiment, account, or native lazy-loading implementation.
import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.resolve(process.env.EXTENSION_PATH || root);
let id;
const fixture = await readFile(path.join(root, "tests/fixture.html"), "utf8");
const profile = await mkdtemp(path.join(tmpdir(), "sidecomments-test-"));
const output = path.join(root, "output/playwright");
await mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
  channel: "chromium",
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: [`--disable-extensions-except=${extensionRoot}`, `--load-extension=${extensionRoot}`],
  viewport: { width: 1440, height: 1000 }
});
const errors = [];
let checks = 0;
const passed = (name) => { checks++; console.log(`PASS ${name}`); };
try {
  const page = context.pages()[0] || await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  // Confirm the extension is registered before its first document_start match.
  // This matters when loading a freshly extracted release from a new path.
  const registry = await context.newPage();
  await registry.goto("chrome://extensions");
  const card = registry.locator("extensions-item").filter({
    has: registry.locator("#name").filter({ hasText: "SideComments for YouTube" })
  });
  await card.waitFor({ state: "attached" });
  id = await card.getAttribute("id");
  assert.ok(id, "Chrome must assign an extension ID");
  await registry.close();
  const ready = await context.newPage();
  await ready.goto(`chrome-extension://${id}/popup.html`);
  await ready.getByRole("switch").waitFor({ state: "visible" });
  await ready.close();
  await context.route("https://www.youtube.com/**", route => route.fulfill({ contentType: "text/html", body: fixture }));
  await page.goto("https://www.youtube.com/watch?v=fixture");
  const active = () => page.waitForFunction(() => document.querySelector("ytd-watch-flexy.ytcs-active"));
  const inactive = () => page.waitForFunction(() => !document.querySelector(".ytcs-active"));
  await active();
  await page.waitForFunction(() => document.querySelector("#secondary .ytcs-comments-panel ytd-comments#comments") &&
    document.querySelector("#primary #related.ytcs-related"));
  passed("real extension loads and swaps normal-mode sections");
  await page.screenshot({ path: path.join(output, "normal.png") });
  const theme = () => page.locator(".ytcs-comments-panel").evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    text: getComputedStyle(el).color,
    scheme: getComputedStyle(el).colorScheme,
    overflow: getComputedStyle(el).overflowY
  }));
  await page.emulateMedia({ colorScheme: "dark" });
  assert.equal((await theme()).background, "rgb(255, 255, 255)");
  assert.equal((await theme()).scheme, "light");
  passed("YouTube light theme stays light even when the system prefers dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => document.documentElement.setAttribute("dark", ""));
  assert.deepEqual(await theme(), {
    background: "rgb(15, 15, 15)", text: "rgb(241, 241, 241)", scheme: "dark", overflow: "auto"
  });
  await page.screenshot({ path: path.join(output, "dark-normal.png") });
  await page.evaluate(() => document.documentElement.style.setProperty("--yt-spec-base-background", "initial"));
  assert.equal((await theme()).background, "rgb(15, 15, 15)");
  await page.evaluate(() => document.documentElement.style.removeProperty("--yt-spec-base-background"));
  passed("YouTube dark theme has readable panel colors with stale or missing legacy tokens, independent of system preference");
  await page.evaluate(() => document.documentElement.removeAttribute("dark"));
  assert.equal((await theme()).background, "rgb(255, 255, 255)");
  assert.equal((await theme()).scheme, "light");
  passed("theme changes apply immediately without reloading or replacing comments");
  await page.getByRole("button", { name: "Sort by", exact: true }).click();
  assert.equal(await page.locator("#sort").textContent(), "Newest first");
  await page.getByRole("button", { name: "Reply", exact: true }).first().click();
  assert.equal(await page.getByLabel("Reply text", { exact: true }).first().isVisible(), true);
  await page.getByLabel("Add a comment", { exact: true }).fill("Draft survives layout changes");
  passed("existing sort/reply listeners and comment input survive reparenting");

  await page.evaluate(() => document.querySelector("ytd-watch-flexy").setAttribute("theater", ""));
  await active();
  await page.waitForFunction(() => document.querySelector("#full-bleed-container").getBoundingClientRect().height > 0);
  await page.screenshot({ path: path.join(output, "theater.png") });
  assert.equal(await page.locator("#secondary ytd-comments#comments").count(), 1);
  await page.evaluate(() => document.documentElement.setAttribute("dark", ""));
  assert.equal((await theme()).background, "rgb(15, 15, 15)");
  await page.screenshot({ path: path.join(output, "dark-theater.png") });
  await page.evaluate(() => document.documentElement.removeAttribute("dark"));
  passed("theater mode keeps the full-width player and swapped sections below");

  await page.setViewportSize({ width: 800, height: 1000 });
  await inactive();
  assert.equal(await page.locator("#primary ytd-comments#comments").count(), 1);
  assert.equal(await page.locator("#secondary-inner > #related").count(), 1);
  assert.equal(await page.getByLabel("Add a comment", { exact: true }).inputValue(), "Draft survives layout changes");
  passed("narrow layout restores both original positions and preserves draft");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await active();
  passed("widening restores the swap");

  const popup = await context.newPage();
  await popup.emulateMedia({ colorScheme: "dark" });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  assert.equal(await popup.locator("body").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(24, 24, 24)");
  assert.equal(await popup.locator("body").evaluate(el => getComputedStyle(el).color), "rgb(238, 238, 238)");
  await popup.screenshot({ path: path.join(output, "dark-popup.png") });
  await popup.emulateMedia({ colorScheme: "light" });
  assert.equal(await popup.locator("body").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
  passed("popup follows light and dark system themes with readable foreground colors");
  const [privacy] = await Promise.all([
    popup.waitForEvent("popup"),
    popup.getByRole("link", { name: "Privacy", exact: true }).click()
  ]);
  await privacy.waitForLoadState();
  assert.equal(await privacy.title(), "Privacy — SideComments for YouTube");
  assert.equal(await privacy.getByRole("link", { name: "kisanthapa33@gmail.com" }).getAttribute("href"), "mailto:kisanthapa33@gmail.com");
  await privacy.close();
  passed("packaged privacy page opens from popup and shows the supplied support contact");
  const toggle = popup.getByRole("switch");
  await toggle.uncheck();
  await inactive();
  assert.equal(await page.locator(".ytcs-comments-panel").count(), 0);
  await popup.reload();
  assert.equal(await toggle.isChecked(), false);
  await toggle.check();
  await active();
  passed("popup disables/restores immediately and persists the preference");
  await popup.close();

  await page.evaluate(() => {
    document.dispatchEvent(new Event("yt-navigate-start"));
    history.pushState({}, "", "/");
  });
  await inactive();
  await page.evaluate(() => {
    history.pushState({}, "", "/watch?v=second");
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await active();
  passed("SPA navigation away from and back to watch restores/reapplies");

  await page.evaluate(() => {
    const old = document.querySelector("ytd-comments#comments");
    const replacement = old.cloneNode(true);
    replacement.classList.remove("ytcs-comments");
    replacement.dataset.replaced = "yes";
    document.querySelector("#primary .box").append(replacement);
  });
  await page.waitForFunction(() => document.querySelector("#secondary ytd-comments[data-replaced=yes]"));
  assert.equal(await page.locator("ytd-comments#comments").count(), 1);
  assert.equal(await page.locator(".ytcs-comments-panel").count(), 1);
  passed("replacement comments renderer supersedes stale moved node");

  await page.evaluate(() => {
    const replacement = document.querySelector("#primary #related").cloneNode(true);
    replacement.classList.remove("ytcs-related");
    replacement.dataset.replaced = "yes";
    document.querySelector("#secondary-inner").append(replacement);
  });
  await page.waitForFunction(() => document.querySelector("#primary #related[data-replaced=yes]"));
  assert.equal(await page.locator("#related.ytcs-related").count(), 1);
  assert.equal(await page.locator("#related-skeleton > #related").count(), 1);
  passed("recommendations replacement ignores duplicate skeleton ID");

  await page.evaluate(() => document.querySelector("ytd-watch-flexy").setAttribute("fullscreen", ""));
  await inactive();
  await page.evaluate(() => document.querySelector("ytd-watch-flexy").removeAttribute("fullscreen"));
  await active();
  passed("fullscreen flag restores layout and re-applies on exit");

  await page.evaluate(() => document.querySelector("ytd-comments#comments").hidden = true);
  await inactive();
  await page.evaluate(() => document.querySelector("ytd-comments#comments").hidden = false);
  await active();
  passed("hidden/disabled comments leave recommendations in place");
  const panel = page.locator(".ytcs-comments-panel");
  const geometry = await panel.evaluate(el => ({
    scroll: el.scrollHeight, client: el.clientHeight, height: el.getBoundingClientRect().height,
    maxHeight: getComputedStyle(el).maxHeight, overflow: getComputedStyle(el).overflowY
  }));
  assert.notEqual(geometry.maxHeight, "none");
  assert.equal(geometry.overflow, "auto");
  assert.ok(geometry.scroll > geometry.client);
  assert.ok(geometry.height <= 1000);
  assert.equal(await panel.getAttribute("tabindex"), "0");
  await panel.evaluate(el => {
    const more = document.createElement("article");
    more.style.height = "500px";
    more.textContent = "Another loaded comment";
    el.querySelector("#threads").append(more);
  });
  assert.equal(await panel.evaluate(el => el.getBoundingClientRect().height), geometry.height);
  await page.evaluate(() => scrollTo(0, 0));
  const bounds = await panel.boundingBox();
  await page.mouse.move(bounds.x + 100, bounds.y + 100);
  await page.mouse.wheel(0, 600);
  await page.waitForFunction(() => document.querySelector(".ytcs-comments-panel").scrollTop > 100);
  assert.equal(await page.evaluate(() => scrollY), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  passed("boxed comments stay height-limited as content loads; wheel scrolls the panel independently without page overflow");

  // Hold the parser on a resource after the columns exist. document_idle would
  // not run yet; the early content script must already have performed the swap.
  let releaseBlocker;
  const blocker = new Promise(resolve => { releaseBlocker = resolve; });
  await context.route("https://www.youtube.com/startup-blocker.js", async route => {
    await blocker;
    await route.fulfill({ contentType: "text/javascript", body: "/* released */" });
  });
  await context.route("https://www.youtube.com/watch?v=early", route => route.fulfill({
    contentType: "text/html", body: fixture.replace("</html>", '<script src="/startup-blocker.js"></script></html>')
  }));
  const early = await context.newPage();
  try {
    await early.goto("https://www.youtube.com/watch?v=early", { waitUntil: "commit" });
    await early.waitForFunction(() => document.querySelector(".ytcs-active"));
    assert.equal(await early.evaluate(() => document.readyState), "loading");
    passed("swap starts while document is still loading, without waiting for document_idle");
  } finally {
    releaseBlocker();
    await early.close();
  }
  assert.deepEqual(errors, []);
  console.log(`\n${checks} checks passed. No page JavaScript errors. Chromium ${context.browser()?.version()}.`);
} catch (error) {
  for (const openPage of context.pages()) {
    if (openPage.url().startsWith("chrome://extensions")) {
      console.error("Extension registry:", await openPage.locator("body").innerText());
      console.error("Extension cards:", await openPage.locator("extensions-item").evaluateAll(items => items.map(item => ({
        id: item.id, text: item.shadowRoot?.textContent?.trim().slice(0, 500)
      }))));
    }
  }
  const page = context.pages()[0];
  if (page && !page.isClosed()) {
    console.error("Fixture failure:", await page.evaluate(() => ({
      url: location.href,
      ready: document.readyState,
      watch: document.querySelectorAll("ytd-watch-flexy").length,
      panels: document.querySelectorAll(".ytcs-comments-panel").length,
      commentsParent: document.querySelector("ytd-comments#comments")?.parentElement?.id,
      primary: document.querySelector("#primary")?.getBoundingClientRect().toJSON(),
      secondary: document.querySelector("#secondary")?.getBoundingClientRect().toJSON()
    })));
    await page.screenshot({ path: path.join(output, "fixture-failure.png") });
  }
  throw error;
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
