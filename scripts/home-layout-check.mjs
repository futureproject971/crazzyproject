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

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
    colorScheme: "light",
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
  await page.waitForSelector(".crazy-category-card", { timeout: 15_000 });
  await page.waitForSelector(".crazy-home-featured .crazy-featured__card.is-active", { timeout: 15_000 });
  await page.waitForTimeout(1200);

  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || r.width === 0 || r.height === 0) return null;
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    const rects = (selector) =>
      [...document.querySelectorAll(selector)].map((el, index) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          index,
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90),
          visible: style.display !== "none" && style.visibility !== "hidden" && r.width > 0 && r.height > 0,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      }).filter((item) => item.visible);

    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      header: rect(".crazy-site-header"),
      logo: rect(".crazy-logo"),
      featured: rect(".crazy-home-featured"),
      trustbar: rect(".crazy-trustbar"),
      footer: rect(".crazy-hero-footer"),
      support: rect(".crazzy-support-trigger"),
      explore: rect(".crazy-hero__explore"),
      categories: rects(".crazy-category-card"),
      activeCard: rect(".crazy-home-featured .crazy-featured__card.is-active"),
      sideCards: rects(".crazy-home-featured .crazy-featured__card:not(.is-active)"),
    };
  });

  const collisions = [];
  const cards = layout.categories;

  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      const hit = overlap(cards[i], cards[j], 2);
      if (hit) {
        collisions.push({
          type: "category-category",
          a: cards[i].text,
          b: cards[j].text,
          overlap: hit,
        });
      }
    }
  }

  const protectedRegions = [
    ["header", layout.header],
    ["logo", layout.logo],
    ["featured", layout.featured],
    ["trustbar", layout.trustbar],
    ["footer", layout.footer],
  ];

  for (const card of cards) {
    for (const [name, region] of protectedRegions) {
      const hit = overlap(card, region, 3);
      if (hit) {
        collisions.push({
          type: `category-${name}`,
          a: card.text,
          b: name,
          overlap: hit,
        });
      }
    }
  }

  for (const [aName, a, bName, b] of [
    ["featured", layout.featured, "trustbar", layout.trustbar],
    ["featured", layout.featured, "footer", layout.footer],
    ["trustbar", layout.trustbar, "footer", layout.footer],
    ["header", layout.header, "logo", layout.logo],
    ["support", layout.support, "footer", layout.footer],
    ["support", layout.support, "trustbar", layout.trustbar],
    ["support", layout.support, "featured", layout.featured],
    ["support", layout.support, "header", layout.header],
  ]) {
    const hit = overlap(a, b, 3);
    if (hit) collisions.push({ type: `${aName}-${bName}`, a: aName, b: bName, overlap: hit });
  }

  const horizontalOverflow = layout.document.scrollWidth > layout.viewport.width + 2;
  const blocking = collisions.length > 0 || horizontalOverflow || consoleErrors.length > 0;
  if (blocking) hasBlockingCollision = true;

  const entry = {
    ...viewport,
    layout,
    collisions,
    horizontalOverflow,
    consoleErrors,
    blocking,
  };
  report.push(entry);

  await page.screenshot({
    path: path.join(outputDir, `${viewport.name}.png`),
    fullPage: true,
  });

  console.log("HOME_LAYOUT_RESULT", JSON.stringify({
    viewport: viewport.name,
    categories: cards.length,
    collisions,
    horizontalOverflow,
    consoleErrors,
    document: layout.document,
    activeCard: layout.activeCard,
  }));

  await context.close();
}

await browser.close();

fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));

const summary = {
  checked: report.map(({ name, width, height, collisions, horizontalOverflow, consoleErrors }) => ({
    name,
    width,
    height,
    collisions: collisions.length,
    horizontalOverflow,
    consoleErrors: consoleErrors.length,
  })),
  passed: !hasBlockingCollision,
};

console.log("HOME_LAYOUT_SUMMARY", JSON.stringify(summary));
if (hasBlockingCollision) process.exitCode = 1;
