import { connect } from "puppeteer-real-browser";
import type { Browser, Page } from "puppeteer";
import { execSync } from "child_process";

function findChromePath(): string | undefined {
  const candidates = [
    "/root/.cache/puppeteer/chrome/linux-145.0.7632.77/chrome-linux64/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  try {
    const which = execSync(
      "which google-chrome 2>/dev/null || which chromium 2>/dev/null",
      { encoding: "utf-8" }
    ).trim();
    if (which) candidates.unshift(which);
  } catch {
    // not found
  }

  for (const p of candidates) {
    try {
      execSync(`test -f "${p}"`, { stdio: "ignore" });
      return p;
    } catch {
      // doesn't exist
    }
  }
  return undefined;
}

/**
 * Launch a stealth browser session using puppeteer-real-browser.
 * Returns both browser and page — the page is pre-created by the library.
 */
export async function launchSession(): Promise<{
  browser: Browser;
  page: Page;
}> {
  const chromePath = findChromePath();
  if (chromePath) {
    console.log(`Using Chrome: ${chromePath}`);
  }

  const { browser, page } = await connect({
    headless: false,
    turnstile: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    customConfig: {
      ...(chromePath ? { chromePath } : {}),
    },
    connectOption: {
      defaultViewport: { width: 1920, height: 1080 },
    },
  });

  return { browser: browser as unknown as Browser, page: page as unknown as Page };
}

/**
 * Navigate to rubinot.com.br and wait for Cloudflare challenge to clear.
 */
export async function establishSession(page: Page): Promise<void> {
  console.log("Establishing session on rubinot.com.br...");

  await page.goto("https://rubinot.com.br/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const maxWait = 60000;
  const interval = 3000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;

    // Simulate human-like interaction while waiting
    try {
      await page.mouse.move(
        200 + Math.random() * 400,
        200 + Math.random() * 300
      );
    } catch {
      // page might not be ready for mouse events yet
    }

    const cookies = await page.cookies();
    const hasClearance = cookies.some((c) => c.name === "cf_clearance");
    const title = await page.title();
    const isChallenge =
      title.includes("Just a moment") ||
      title.includes("Attention Required");

    if (hasClearance || !isChallenge) {
      console.log(
        `Session established (${elapsed / 1000}s). ` +
          `Cookies: ${cookies.length}, cf_clearance: ${hasClearance}`
      );
      return;
    }

    process.stdout.write(
      `  Waiting for Cloudflare... ${elapsed / 1000}s\r`
    );
  }

  const cookies = await page.cookies();
  console.log(
    `\nCloudflare wait timed out (${cookies.length} cookies). Proceeding anyway...`
  );
}

/**
 * Fetch JSON from a RubinOT API endpoint.
 * Primary: in-page fetch (fast, inherits session cookies).
 * Fallback: direct page.goto navigation (full browser stack).
 */
export async function fetchApiData(
  page: Page,
  url: string
): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));

  // Primary approach: in-page fetch
  const result = await page.evaluate(async (apiUrl: string) => {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const text = await res.text();
      try {
        return { ok: true, data: JSON.parse(text) };
      } catch {
        return { ok: false, error: `Not JSON: ${text.slice(0, 200)}` };
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, url);

  if (result.ok) {
    return result.data;
  }

  // Fallback: navigate directly to the API URL
  if (typeof result.error === "string" && result.error.startsWith("Not JSON")) {
    console.log(`    Fallback: navigating to ${url}`);
    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const text = await response?.text() ?? "";

    // If Cloudflare challenged the API URL, wait for it to clear
    if (text.includes("Just a moment") || text.includes("challenge-platform")) {
      console.log("    Waiting for Cloudflare on API URL...");
      await new Promise((r) => setTimeout(r, 10000));
      const body = await page.evaluate(() => document.body?.innerText ?? "");
      try {
        return JSON.parse(body);
      } catch {
        throw new Error(`Not JSON after fallback: ${body.slice(0, 200)}`);
      }
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Not JSON (fallback): ${text.slice(0, 200)}`);
    }
  }

  throw new Error(result.error as string);
}
