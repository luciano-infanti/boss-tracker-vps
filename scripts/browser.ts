import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import path from "path";
import os from "os";
import fs from "fs";

puppeteer.use(StealthPlugin());

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
];

const CHROME_FLAGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--no-first-run",
  "--lang=pt-BR,en-US,en;q=0.9",
];

const USER_DATA_DIR = path.join(
  os.homedir(),
  ".cache",
  "boss-tracker-chrome-profile"
);

export async function launchSession(): Promise<{
  browser: Browser;
  page: Page;
}> {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  console.log(`UA: ...${ua.slice(ua.indexOf("Chrome"))}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: CHROME_FLAGS,
    userDataDir: USER_DATA_DIR,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.setUserAgent(ua);
  await page.setExtraHTTPHeaders({
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  });

  return { browser, page };
}

/**
 * Navigate to the site and wait for Cloudflare to clear.
 * Uses a DOM selector that only appears on the real page (not the CF challenge).
 * Then navigates to /killstats to set correct Referer for API calls.
 */
export async function establishSession(page: Page): Promise<void> {
  console.log("Establishing session on rubinot.com.br...");

  await page.goto("https://rubinot.com.br/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // #__next only appears once the real Next.js page renders (not during CF challenge).
  try {
    await page.waitForFunction(
      () =>
        !document.title.includes("Just a moment") &&
        document.querySelector("#__next") !== null,
      { timeout: 60000, polling: 2000 }
    );
    console.log("Cloudflare cleared.");
  } catch {
    console.log(
      "Timeout waiting for real content — proceeding (cookies may still be valid from a previous run)..."
    );
  }

  await new Promise((r) => setTimeout(r, 3000));

  let cookies = await page.cookies();
  const hasCf = cookies.some((c) => c.name === "cf_clearance");
  console.log(`Main page: ${cookies.length} cookies, cf_clearance: ${hasCf}`);

  // Navigate to /killstats — the Referer from this page is what the WAF expects
  // when we call /api/killstats. Also triggers NextAuth to set CSRF cookies.
  console.log("Navigating to /killstats...");
  await page.goto("https://rubinot.com.br/killstats", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  try {
    await page.waitForFunction(
      () =>
        !document.title.includes("Just a moment") &&
        document.querySelector("#__next") !== null,
      { timeout: 45000, polling: 2000 }
    );
  } catch {
    // continue — may already have valid cookies from userDataDir
  }

  await new Promise((r) => setTimeout(r, 2000));

  cookies = await page.cookies();
  console.log(
    `Session ready. ${cookies.length} cookies: ${cookies.map((c) => c.name).join(", ")}`
  );
}

/**
 * Fetch JSON from the API using page.evaluate(fetch()) so the request
 * goes through the browser's network stack (same TLS fingerprint, same
 * cookies, same origin as the Cloudflare session).
 */
export async function fetchApiData(
  page: Page,
  url: string
): Promise<unknown> {
  // Small random delay between requests to look more human
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));

  const result = await page.evaluate(async (apiUrl: string) => {
    try {
      const res = await fetch(apiUrl, {
        credentials: "include",
        headers: {
          accept: "*/*",
          "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      const text = await res.text();
      try {
        return { ok: true, data: JSON.parse(text) };
      } catch {
        return { ok: false, status: res.status, body: text.slice(0, 500) };
      }
    } catch (err) {
      return {
        ok: false,
        status: 0,
        body: err instanceof Error ? err.message : String(err),
      };
    }
  }, url);

  if (result.ok) {
    return result.data;
  }

  throw new Error(`HTTP ${result.status}: ${result.body}`);
}
