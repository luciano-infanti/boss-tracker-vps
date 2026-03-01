import { connect } from "puppeteer-real-browser";
import type { Browser, Page } from "puppeteer";
import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

const USER_DATA_DIR = path.join(
  os.homedir(),
  ".cache",
  "boss-tracker-browser"
);

function findChromePath(): string | undefined {
  // Check Puppeteer's cache first (glob for any version)
  const puppeteerBase = path.join(os.homedir(), ".cache", "puppeteer", "chrome");
  if (fs.existsSync(puppeteerBase)) {
    try {
      const versions = fs.readdirSync(puppeteerBase).sort().reverse();
      for (const ver of versions) {
        const bin = path.join(puppeteerBase, ver, "chrome-linux64", "chrome");
        if (fs.existsSync(bin)) return bin;
      }
    } catch {
      // ignore
    }
  }

  // System Chrome (skip snap — it doesn't work with Puppeteer)
  const candidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  for (const p of candidates) {
    if (p.includes("snap")) continue;
    try {
      const resolved = fs.realpathSync(p);
      if (resolved.includes("snap")) continue;
      return p;
    } catch {
      // doesn't exist
    }
  }
  return undefined;
}

export async function launchSession(): Promise<{
  browser: Browser;
  page: Page;
}> {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const chromePath = findChromePath();
  if (chromePath) console.log(`Using Chrome: ${chromePath}`);

  const { browser, page } = await connect({
    headless: false,
    turnstile: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--no-first-run",
      "--lang=pt-BR,en-US,en;q=0.9",
    ],
    customConfig: {
      ...(chromePath ? { chromePath } : {}),
      userDataDir: USER_DATA_DIR,
    },
    connectOption: {
      defaultViewport: { width: 1920, height: 1080 },
    },
  });

  return {
    browser: browser as unknown as Browser,
    page: page as unknown as Page,
  };
}

async function waitForCloudflare(
  page: Page,
  timeoutMs = 60000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 3000));

    try {
      await page.mouse.move(
        200 + Math.random() * 400,
        200 + Math.random() * 300
      );
    } catch {
      // ignore
    }

    const title = await page.title();
    if (
      !title.includes("Just a moment") &&
      !title.includes("Attention Required")
    ) {
      return true;
    }
  }
  return false;
}

export async function establishSession(page: Page): Promise<void> {
  console.log("Establishing session on rubinot.com.br...");

  await page.goto("https://rubinot.com.br/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const cfPassed = await waitForCloudflare(page);
  console.log(cfPassed ? "Cloudflare passed." : "CF timeout — using cached cookies...");

  // Wait for network to settle and JS to set cookies (analytics, CSRF, etc.)
  try {
    await page.waitForNetworkIdle({ idleTime: 2000, timeout: 15000 });
  } catch {
    // continue
  }
  await new Promise((r) => setTimeout(r, 5000));

  let cookies = await page.cookies();
  const hasCf = cookies.some((c) => c.name === "cf_clearance");
  console.log(`Main page: ${cookies.length} cookies, cf_clearance: ${hasCf}`);

  // Diagnostic: confirm the page actually rendered
  const diag = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyLength: document.body?.innerText?.length ?? 0,
  }));
  console.log(`  Page: "${diag.title}" — ${diag.bodyLength} chars of content`);

  // Navigate to /killstats for correct Referer on API calls
  console.log("Navigating to /killstats...");
  await page.goto("https://rubinot.com.br/killstats", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await waitForCloudflare(page, 30000);

  try {
    await page.waitForNetworkIdle({ idleTime: 2000, timeout: 15000 });
  } catch {
    // continue
  }
  await new Promise((r) => setTimeout(r, 3000));

  cookies = await page.cookies();
  console.log(
    `Session ready. ${cookies.length} cookies: ${cookies.map((c) => c.name).join(", ")}`
  );

  const diag2 = await page.evaluate(() => ({
    title: document.title,
    bodyLength: document.body?.innerText?.length ?? 0,
  }));
  console.log(`  /killstats: "${diag2.title}" — ${diag2.bodyLength} chars`);
}

/**
 * Fetch JSON from the API via in-page fetch (same TLS, same cookies).
 */
export async function fetchApiData(
  page: Page,
  url: string
): Promise<unknown> {
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
