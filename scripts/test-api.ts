/**
 * Quick test to verify the RubinOT API is reachable via headless browser.
 * Does NOT require a database — just fetches one world and prints results.
 *
 * Usage:  npm run scrape:test
 */

import { TRACKED_BOSSES, WORLDS } from "../src/lib/constants";
import { launchBrowser, establishSession, fetchApiData } from "./browser";

const BOSS_SET = new Set<string>(TRACKED_BOSSES);

async function testApi() {
  const testWorld = WORLDS[0];
  const apiUrl = `https://rubinot.com.br/api/killstats?world=${testWorld.id}`;

  console.log(`\n--- RubinOT API Test ---`);
  console.log(`World: ${testWorld.name} (id: ${testWorld.id})`);
  console.log(`API:   ${apiUrl}\n`);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await establishSession(page);

    console.log(`\nFetching API data...`);
    const data = (await fetchApiData(page, apiUrl)) as {
      entries?: Array<{
        race_name: string;
        creatures_killed_24h: number;
        creatures_killed_7d: number;
      }>;
      error?: string;
    };

    if (data.error) {
      console.error(`API returned error: ${data.error}`);
      return;
    }

    console.log(`Response keys: ${Object.keys(data).join(", ")}`);

    if (!data.entries || !Array.isArray(data.entries)) {
      console.log(`Full response:`);
      console.log(JSON.stringify(data, null, 2).slice(0, 2000));
      return;
    }

    console.log(`Total creatures returned: ${data.entries.length}`);

    const bossEntries = data.entries.filter((e) => BOSS_SET.has(e.race_name));

    console.log(
      `Tracked bosses found: ${bossEntries.length} / ${TRACKED_BOSSES.length}\n`
    );

    if (bossEntries.length > 0) {
      console.log(`${"Boss Name".padEnd(30)} | 24h Kills | 7d Kills`);
      console.log(`${"-".repeat(30)}-+-----------+----------`);

      for (const boss of bossEntries.slice(0, 10)) {
        console.log(
          `${boss.race_name.padEnd(30)} | ${String(boss.creatures_killed_24h).padStart(9)} | ${String(boss.creatures_killed_7d).padStart(8)}`
        );
      }

      if (bossEntries.length > 10) {
        console.log(`  ... and ${bossEntries.length - 10} more`);
      }
    }

    console.log(`\nAPI test passed. The scraper will work.`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${msg}`);
  } finally {
    await browser.close();
  }
}

testApi();
