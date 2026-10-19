// Optional network-dependent smoke check against a public YouTube watch page.
// Uses a disposable, signed-out profile; never submits comments or reactions.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storeScreenshots = process.argv.includes("--store");
const darkMode = process.argv.includes("--dark");
const imagePrefix = darkMode ? "live-dark" : "live";
const profile = await mkdtemp(path.join(tmpdir(), "sidecomments-live-"));
await mkdir(path.join(root, "output/playwright"), { recursive: true });
if (storeScreenshots) await mkdir(path.join(root, "store/assets"), { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
  channel: "chromium",
  colorScheme: "light",
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: storeScreenshots ? { width: 1280, height: 800 } : { width: 1440, height: 1000 }
});
try {
  const page = context.pages()[0] || await context.newPage();
  await page.goto("https://www.youtube.com/watch?v=jNQXAC9IVRw", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".ytcs-active"), null, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector(".ytcs-comments ytd-comment-thread-renderer"), null, { timeout: 45000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector(".ytcs-comments-panel");
    return panel && panel.scrollHeight > panel.clientHeight + 8;
  });
  console.log("PASS live comments loaded in sidebar", await page.locator(".ytcs-comments ytd-comment-thread-renderer").count());
  await page.locator("video").evaluateAll(videos => videos.forEach(video => video.pause()));
  assert.equal(await page.locator("#primary #related.ytcs-related").count(), 1);
  if (darkMode) {
    if (!await page.locator("html[dark], ytd-app[dark]").count()) {
      // Exercise YouTube's actual appearance control; a browser preference
      // alone does not necessarily select the website's theme.
      await page.locator("ytd-masthead").getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByText(/^Appearance:/).click();
      await page.getByText("Dark theme", { exact: true }).click();
    }
    await page.waitForFunction(() => document.documentElement.hasAttribute("dark") || document.querySelector("ytd-app[dark]"));
    await page.evaluate(async () => {
      await document.activeViewTransition?.finished;
      await Promise.allSettled(document.getAnimations().filter(animation =>
        animation.effect?.getComputedTiming().endTime < 5000
      ).map(animation => animation.finished));
    });
    // Selecting Appearance can refresh YouTube's comments. Wait for that load
    // before measuring the bounded panel or testing its continuation.
    await page.waitForFunction(() => {
      const panel = document.querySelector(".ytcs-comments-panel");
      return panel && panel.querySelectorAll("ytd-comment-thread-renderer").length >= 20 && panel.scrollHeight > panel.clientHeight + 8;
    });
    const colors = await page.locator(".ytcs-comments-panel").evaluate(el => ({
      background: getComputedStyle(el).backgroundColor, text: getComputedStyle(el).color,
      scheme: getComputedStyle(el).colorScheme
    }));
    assert.deepEqual(colors, { background: "rgb(15, 15, 15)", text: "rgb(241, 241, 241)", scheme: "dark" });
    console.log("PASS live YouTube dark theme and comments panel colors");
  }
  await page.screenshot({ path: path.join(root, `output/playwright/${imagePrefix}-normal.png`) });
  if (storeScreenshots) {
    await page.screenshot({ path: path.join(root, "store/assets/screenshot-normal.png") });
  }
  const panel = page.locator(".ytcs-comments-panel");
  const firstBatch = await page.locator(".ytcs-comments ytd-comment-thread-renderer").count();
  await panel.evaluate(el => {
    if (getComputedStyle(el).overflowY !== "auto" || getComputedStyle(el).maxHeight === "none") {
      throw new Error("Comments must remain inside a height-limited scroll panel");
    }
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForFunction(count => document.querySelectorAll(".ytcs-comments ytd-comment-thread-renderer").length > count, firstBatch, { timeout: 30000 });
  const bounds = await panel.evaluate(el => ({ height: el.offsetHeight, cap: parseFloat(getComputedStyle(el).maxHeight) }));
  assert.ok(bounds.height <= bounds.cap + 2);
  assert.ok(await panel.evaluate(el => el.scrollTop) > 0);
  console.log("PASS live panel scrolling loads additional comments without growing the box", await page.locator(".ytcs-comments ytd-comment-thread-renderer").count());
  await page.evaluate(() => scrollTo(0, 0));
  const theater = page.getByRole("button", { name: /Theater mode/ });
  await theater.click();
  // Theater mode animates. Wait for real layout geometry, not only the flag.
  await page.waitForFunction(() => {
    const watch = document.querySelector("ytd-watch-flexy[theater].ytcs-active");
    const player = watch?.querySelector("#full-bleed-container")?.getBoundingClientRect();
    const panel = watch?.querySelector(".ytcs-comments-panel")?.getBoundingClientRect();
    return player?.height > 0 && panel?.top >= player.bottom - 2;
  });
  assert.equal(await page.locator("#secondary .ytcs-comments-panel").count(), 1);
  await panel.evaluate(el => el.scrollTop = 0);
  // YouTube can use a View Transition snapshot after geometry has settled.
  // Wait for finite UI animations so screenshots show the final painted page.
  await page.evaluate(async () => {
    await document.activeViewTransition?.finished;
    await Promise.allSettled(document.getAnimations().filter(animation =>
      animation.effect?.getComputedTiming().endTime < 5000
    ).map(animation => animation.finished));
  });
  if (darkMode) assert.equal(await panel.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(15, 15, 15)");
  await page.screenshot({ path: path.join(root, `output/playwright/${imagePrefix}-theater.png`) });
  if (storeScreenshots) {
    // Show the lower part of the wide player and the swapped sections beneath.
    // This is a direct viewport screenshot, without overlays or compositing.
    await page.locator("#primary #related.ytcs-related").waitFor({ state: "visible" });
    await page.locator("#primary #related.ytcs-related").evaluate(el => {
      scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - innerHeight * .58));
    });
    await page.waitForFunction(() => [...document.querySelectorAll("#primary #related img")].some(img => {
      const bounds = img.getBoundingClientRect();
      return bounds.width > 100 && bounds.top < innerHeight && bounds.bottom > 56 && img.complete && img.naturalWidth > 100;
    }), null, { timeout: 20000 });
    await page.screenshot({ path: path.join(root, "store/assets/screenshot-theater.png") });
  }
  console.log("PASS live theater mode: comments below full-width player");
  await page.setViewportSize({ width: 800, height: 1000 });
  await page.waitForFunction(() => !document.querySelector(".ytcs-active"));
  console.log("PASS live narrow-window restoration");
} catch (error) {
  const page = context.pages()[0];
  if (page) {
    await page.screenshot({ path: path.join(root, "output/playwright/live-failure.png") });
    console.error((await page.locator("body").innerText()).slice(0, 1200));
    console.error(JSON.stringify(await page.evaluate(() => ({
      watchTags: [...new Set([...document.querySelectorAll('*')].map(el => el.tagName).filter(tag => tag.includes('WATCH')))],
      flexy: [...document.querySelectorAll('ytd-watch-flexy')].map(el => ({attrs: el.getAttributeNames(),
        primary: el.querySelector('#primary')?.getBoundingClientRect().toJSON(), secondary: el.querySelector('#secondary')?.getBoundingClientRect().toJSON(),
        comments: [...el.querySelectorAll('ytd-comments')].map(c => ({id:c.id, parent:c.parentElement.id, cls:c.parentElement.className})),
        related: [...el.querySelectorAll('#related')].map(c => ({parent:c.parentElement.id,cls:c.className}))})),
      comments: [...document.querySelectorAll('ytd-comments')].map(c => ({id:c.id,parent:c.parentElement.id,tag:c.parentElement.tagName}))
    })), null, 2));
  }
  throw error;
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
