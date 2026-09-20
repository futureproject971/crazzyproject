import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve("artifacts/home-layout");
fs.mkdirSync(outputDir, { recursive: true });

const categories = [
  ["warzone", "Call of Duty Warzone"],
  ["valorant", "Valorant"],
  ["apex", "Apex"],
  ["fivem", "FiveM"],
  ["gta-online", "GTA Online"],
  ["bloodstrike", "BloodStrike"],
  ["ia-universal", "IA Universal"],
  ["dead-by-daylight", "Dead by Daylight"],
  ["arc-raiders", "ARC Raiders"],
  ["vanguard-emulator", "Vanguard Emulator"],
  ["rust", "Rust"],
  ["hell-let-loose", "Hell Let Loose"],
  ["scum", "SCUM"],
  ["squad", "Squad"],
  ["war-dogs", "War Dogs"],
  ["counter-strike-2", "Counter-Strike 2"],
];

const games = categories.map(([slug, name], index) => ({
  id: `game-${String(index + 1).padStart(2, "0")}`,
  name,
  slug,
  image_url: null,
  sort_order: index,
  active: true,
}));

const products = Array.from({ length: 5 }, (_, index) => ({
  id: `featured-${index + 1}`,
  game_id: games[index % games.length].id,
  name: `Produto Destaque ${index + 1}`,
  description: "Produto de teste visual para validar geometria e responsividade da Home.",
  image_url: null,
  sort_order: index,
  status: "online",
  status_label: "Online",
  active: true,
  is_new: true,
  product_plans: [
    {
      id: `plan-${index + 1}`,
      name: "Plano",
      price: 49.9 + index,
      active: true,
      sort_order: 0,
    },
  ],
}));

const viewports = [
  { name: "desktop-1920x1080", width: 1920, height: 1080 },
  { name: "desktop-2560x1440", width: 2560, height: 1440 },
  { name: "ultrawide-3440x1440", width: 3440, height: 1440 },
  { name: "tablet-1024x1366", width: 1024, height: 1366 },
  { name: "mobile-390x844", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const report = [];
let hasBlockingCollision = false;

function overlap(a, b, tolerance = 2) {
  if (!a || !b) return null;
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = right - left;
  const height = bottom - top;
  if (width <= tolerance || height <= tolerance) return null;
  return {
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
    area: Math.round(width * height),
  };
}

for (const viewport of viewports.flatMap(v => ["light", "dark"].map(theme => ({...v, theme, name: `${v.name}-${theme}`})))) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
    colorScheme: viewport.theme,
  });
  const page = await context.newPage();

  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-expose-headers": "content-range",
      "content-type": "application/json",
    };

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors, body: "" });
      return;
    }

    if (url.pathname.includes("/rest/v1/games")) {
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify(games) });
      return;
    }

    if (url.pathname.includes("/rest/v1/products")) {
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify(products) });
      return;
    }

    if (url.pathname.includes("/rest/v1/payment_settings")) {
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify([]) });
      return;
    }

    if (url.pathname.includes("/auth/v1/")) {
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ user: null, session: null }) });
      return;
    }

    await route.fulfill({ status: 200, headers: cors, body: "[]" });
  });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector(".store-product", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  const layout = await page.evaluate(() => {
    const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; };
    return { header: box('.crazy-site-header'), intro: box('.store-intro'), overflow: document.documentElement.scrollWidth > innerWidth + 2, cards: document.querySelectorAll('.store-product').length };
  });
  const failures = [];
  if (layout.overflow) failures.push('horizontal page overflow');
  if (overlap(layout.header, layout.intro)) failures.push('header overlaps intro');
  if (consoleErrors.length) failures.push(...consoleErrors);
  if (!layout.cards) failures.push('catalog missing');
  await page.screenshot({path:path.join(outputDir, `${viewport.name}.png`),fullPage:true});
  const categoryLink = page.locator('.store-category-links a').first();
  if (await categoryLink.getAttribute('href') !== '/produtos?game=warzone') failures.push('category route');
  const productLink = page.locator('.store-product-button').first();
  if (await productLink.getAttribute('href') !== '/produto/featured-1') failures.push('product route');
  report.push({ viewport: viewport.name, ...layout, failures });
  if (failures.length) hasBlockingCollision = true;
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(outputDir,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if (hasBlockingCollision) process.exit(1);
