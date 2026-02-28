import puppeteer from "puppeteer-extra";
import type { Browser, Page } from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { execSync } from "child_process";

puppeteer.use(StealthPlugin());

function findChromePath(): string | undefined {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
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

export async function launchBrowser(): Promise<Browser> {
  try {
    return (await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })) as unknown as Browser;
  } catch {
    const executablePath = findChromePath();
    if (!executablePath) {
      throw new Error(
        "Chrome not found. Either run `npx puppeteer browsers install chrome` " +
          "or install Google Chrome on your system."
      );
    }
    console.log(`Using system Chrome: ${executablePath}`);
    return (await puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })) as unknown as Browser;
  }
}

/**
 * Navigate to rubinot.com.br and wait for Cloudflare challenge to resolve.
 * Returns when we have a valid session with cookies.
 */
export async function establishSession(page: Page): Promise<void> {
  console.log("Establishing session on rubinot.com.br...");
  await page.goto("https://rubinot.com.br/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Wait for Cloudflare challenge to resolve (poll for up to 30 seconds)
  const maxWait = 30000;
  const interval = 2000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;

    const title = await page.title();
    // Cloudflare challenge page has "Just a moment..." as title
    if (!title.includes("Just a moment")) {
      const cookies = await page.cookies();
      console.log(
        `Session established (${elapsed / 1000}s). ` +
          `Cookies: ${cookies.length}`
      );
      return;
    }
    process.stdout.write(
      `  Waiting for Cloudflare... ${elapsed / 1000}s\r`
    );
  }

  // Even if timeout, try to proceed — might work
  console.log("Cloudflare wait timed out, proceeding anyway...");
}

/**
 * Fetch JSON data from a RubinOT API endpoint via XHR from the page context.
 * Must be called after establishSession().
 */
export async function fetchApiData(
  page: Page,
  url: string
): Promise<unknown> {
  const result = await page.evaluate(async (apiUrl: string) => {
    try {
      const res = await fetch(apiUrl);
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

  if (!result.ok) {
    throw new Error(result.error as string);
  }

  return result.data;
}
