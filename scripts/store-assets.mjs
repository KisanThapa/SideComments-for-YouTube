// Render original vector artwork; no third-party logos or remote assets.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await mkdir(path.join(root, "store/assets"), { recursive: true });
const browser = await chromium.launch({
  headless: true, channel: "chromium",
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
});
const logo = '<rect width="32" height="32" rx="9" fill="#ff0033"/><path d="M8 9h16v11H14l-5 4v-4H8z" fill="white"/><path d="M17 12v5m3-5v5" stroke="#ff0033" stroke-width="2"/>';
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    const padded = size === 128 ? `<g transform="translate(4 4) scale(.75)">${logo}</g>` : logo;
    await page.setContent(`<style>body{margin:0;background:transparent}svg{display:block}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">${padded}</svg>`);
    await page.screenshot({ path: path.join(root, `icons/icon${size}.png`), omitBackground: true });
  }
  await page.setViewportSize({ width: 440, height: 280 });
  await page.setContent(`<style>body{margin:0}svg{display:block}</style>
    <svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
      <rect width="440" height="280" fill="#17172b"/>
      <circle cx="435" cy="18" r="155" fill="#2c2045"/>
      <rect x="30" y="36" width="380" height="208" rx="16" fill="#f7f7fb"/>
      <circle cx="48" cy="52" r="3" fill="#ff0033"/><circle cx="60" cy="52" r="3" fill="#bbb9c9"/><circle cx="72" cy="52" r="3" fill="#bbb9c9"/>
      <rect x="46" y="69" width="225" height="112" rx="8" fill="#272942"/>
      <path d="m144 105 33 20-33 20z" fill="#fff"/>
      <rect x="46" y="191" width="225" height="37" rx="7" fill="#e3e4ec"/>
      <rect x="55" y="199" width="37" height="21" rx="4" fill="#b5b9d2"/>
      <rect x="103" y="202" width="105" height="4" rx="2" fill="#9a9fb7"/><rect x="103" y="213" width="74" height="3" rx="1.5" fill="#b7bbce"/>
      <rect x="283" y="69" width="111" height="159" rx="8" fill="#ffe7ee"/>
      <g transform="translate(318 80) scale(1.3)">${logo}</g>
      <g fill="#d1a5b2"><circle cx="300" cy="145" r="5"/><circle cx="300" cy="176" r="5"/><circle cx="300" cy="207" r="5"/></g>
      <g fill="#a66b7c"><rect x="311" y="141" width="65" height="4" rx="2"/><rect x="311" y="172" width="65" height="4" rx="2"/><rect x="311" y="203" width="65" height="4" rx="2"/></g>
      <g fill="#d5a8b6"><rect x="311" y="151" width="51" height="3" rx="1.5"/><rect x="311" y="182" width="51" height="3" rx="1.5"/><rect x="311" y="213" width="51" height="3" rx="1.5"/></g>
    </svg>`);
  await page.screenshot({ path: path.join(root, "store/assets/promo-small.png") });
  console.log("Rendered icons (128px icon has 16px padding) and 440×280 promotional tile.");
} finally {
  await browser.close();
}
