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

  return {
    browser: browser as unknown as Browser,
    page: page as unknown as Page,
  };
}

/**
 * Solve the Cloudflare challenge, then navigate to /killstats so that
 * the browser builds a full cookie jar (cf_clearance + CSRF + analytics)
 * and sets the correct Referer for subsequent API calls.
 */
export async function establishSession(page: Page): Promise<void> {
  console.log("Establishing session on rubinot.com.br...");

  // Step 1: solve Cloudflare on the main page
  await page.goto("https://rubinot.com.br/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  const maxWait = 60000;
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

    const title = await page.title();
    const isChallenge =
      title.includes("Just a moment") ||
      title.includes("Attention Required");

    if (!isChallenge) {
      const cookies = await page.cookies();
      const hasCf = cookies.some((c) => c.name === "cf_clearance");
      console.log(
        `Cloudflare cleared (${elapsed / 1000}s). ` +
          `Cookies: ${cookies.length}, cf_clearance: ${hasCf}`
      );
      break;
    }

    process.stdout.write(`  Waiting for Cloudflare... ${elapsed / 1000}s\r`);
  }

  // Step 2: let the page JS finish setting cookies (analytics, CSRF, etc.)
  await new Promise((r) => setTimeout(r, 3000));

  // Step 3: navigate to /killstats — this sets the Referer that the WAF expects
  // for API calls, and triggers NextAuth to set CSRF cookies.
  console.log("Navigating to /killstats for correct page context...");
  try {
    await page.goto("https://rubinot.com.br/killstats", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // If another Cloudflare challenge appears here, wait for it
    const title = await page.title();
    if (title.includes("Just a moment") || title.includes("Attention Required")) {
      let kElapsed = 0;
      while (kElapsed < 30000) {
        await new Promise((r) => setTimeout(r, 3000));
        kElapsed += 3000;
        const t = await page.title();
        if (!t.includes("Just a moment") && !t.includes("Attention Required")) break;
      }
    }

    // Let page JS finish
    await new Promise((r) => setTimeout(r, 2000));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  /killstats navigation: ${msg}`);
  }

  const cookies = await page.cookies();
  const cookieNames = cookies.map((c) => c.name).join(", ");
  console.log(`Session ready. ${cookies.length} cookies: ${cookieNames}`);
}

/**
 * Fetch JSON from the RubinOT API using an in-page fetch from the /killstats
 * context. This ensures the request uses the browser's TLS fingerprint and
 * has the correct Referer + all cookies (matching what Max's curl sends).
 */
export async function fetchApiData(
  page: Page,
  url: string
): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));

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
        return { ok: false, status: res.status, error: text.slice(0, 300) };
      }
    } catch (err) {
      return {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, url);

  if (result.ok) {
    return result.data;
  }

  throw new Error(
    `HTTP ${result.status}: ${result.error}`
  );
}
