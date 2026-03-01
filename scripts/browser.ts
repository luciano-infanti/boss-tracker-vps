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

async function waitForCloudflare(page: Page, label: string, maxWait = 60000): Promise<boolean> {
  const interval = 3000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;

    try {
      await page.mouse.move(
        200 + Math.random() * 400,
        200 + Math.random() * 300
      );
    } catch {
      // page might not be ready
    }

    const cookies = await page.cookies();
    const hasClearance = cookies.some((c) => c.name === "cf_clearance");
    const title = await page.title();
    const isChallenge =
      title.includes("Just a moment") ||
      title.includes("Attention Required");

    if (hasClearance || !isChallenge) {
      console.log(
        `${label} cleared (${elapsed / 1000}s). ` +
          `Cookies: ${cookies.length}, cf_clearance: ${hasClearance}`
      );
      return true;
    }

    process.stdout.write(
      `  Waiting for Cloudflare (${label})... ${elapsed / 1000}s\r`
    );
  }

  console.log(`\n${label}: Cloudflare wait timed out.`);
  return false;
}

/**
 * Establish a Cloudflare-cleared session on rubinot.com.br.
 * Navigates to the killstats page so that subsequent API calls
 * originate from the correct page context (proper Referer header).
 */
export async function establishSession(page: Page): Promise<void> {
  console.log("Establishing session on rubinot.com.br...");

  await page.goto("https://rubinot.com.br/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await waitForCloudflare(page, "Main page");

  // Navigate to the killstats page to set the correct Referer context.
  // Cloudflare WAF may only allow /api/* calls from certain pages.
  console.log("Navigating to killstats page context...");
  try {
    await page.goto("https://rubinot.com.br/killstats", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const title = await page.title();
    if (title.includes("Just a moment") || title.includes("Attention Required")) {
      await waitForCloudflare(page, "Killstats page", 30000);
    }

    const finalUrl = page.url();
    console.log(`Page context: ${finalUrl} (title: "${await page.title()}")`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`Could not navigate to /killstats: ${msg}`);
    console.log("Will use main page context for API calls.");
  }
}

/**
 * Fetch JSON from a RubinOT killstats API endpoint.
 *
 * Strategy 1: in-page fetch (inherits cookies + Referer from current page)
 * Strategy 2: navigate directly to the API URL and wait for Cloudflare to clear
 * Strategy 3: navigate to rubinot.com.br/killstats?world=X page and scrape
 *             the __NEXT_DATA__ or rendered DOM
 */
export async function fetchApiData(
  page: Page,
  url: string
): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));

  const worldId = new URL(url).searchParams.get("world") ?? "";

  // Strategy 1: in-page fetch from current page context
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
        return { ok: false, error: `Not JSON: ${text.slice(0, 300)}` };
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

  // Strategy 2: navigate to the API URL and wait for any challenge to clear
  console.log(`    [S2] Navigating to API URL for world=${worldId}...`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const title = await page.title();
    if (title.includes("Just a moment") || title.includes("Attention Required")) {
      console.log(`    [S2] Cloudflare challenge on API URL, waiting...`);
      const cleared = await waitForCloudflare(page, `API world=${worldId}`, 30000);

      if (cleared) {
        const body = await page.evaluate(() => document.body?.innerText ?? "");
        try {
          const data = JSON.parse(body);
          // Navigate back to killstats page to keep correct context
          await page.goto("https://rubinot.com.br/killstats", {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });
          return data;
        } catch {
          // fall through
        }
      }
    } else {
      // Page loaded without challenge — try to parse content
      const body = await page.evaluate(() => document.body?.innerText ?? "");
      try {
        const data = JSON.parse(body);
        await page.goto("https://rubinot.com.br/killstats", {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        return data;
      } catch {
        // fall through
      }
    }
  } catch {
    // navigation failed, fall through
  }

  // Strategy 3: navigate to the killstats page with world param and scrape
  console.log(`    [S3] Trying killstats page for world=${worldId}...`);
  try {
    await page.goto(`https://rubinot.com.br/killstats?world=${worldId}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const title = await page.title();
    if (title.includes("Just a moment") || title.includes("Attention Required")) {
      await waitForCloudflare(page, `Killstats world=${worldId}`, 30000);
    }

    // Try to extract __NEXT_DATA__ (Next.js SSR data)
    const nextData = await page.evaluate(() => {
      const el = document.getElementById("__NEXT_DATA__");
      if (el?.textContent) {
        try {
          return JSON.parse(el.textContent);
        } catch {
          return null;
        }
      }
      return null;
    });

    if (nextData?.props?.pageProps?.entries) {
      return nextData.props.pageProps;
    }

    // Try to extract data from window.__NEXT_DATA__ global
    const windowData = await page.evaluate(() => {
      const w = window as any;
      if (w.__NEXT_DATA__?.props?.pageProps?.entries) {
        return w.__NEXT_DATA__.props.pageProps;
      }
      return null;
    });

    if (windowData) {
      return windowData;
    }
  } catch {
    // fall through
  }

  // All strategies failed — throw with diagnostic info
  const errMsg =
    typeof result.error === "string"
      ? result.error
      : "All fetch strategies failed";
  throw new Error(errMsg);
}
