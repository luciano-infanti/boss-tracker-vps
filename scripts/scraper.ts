import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { TRACKED_BOSSES, WORLDS } from "../src/lib/constants";
import { launchBrowser, establishSession, fetchApiData } from "./browser";

const prisma = new PrismaClient();
const BOSS_SET = new Set<string>(TRACKED_BOSSES);

function getEffectiveKillDate(): string {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  return formatter.format(shiftedTime);
}

interface KillStatsEntry {
  race_name: string;
  creatures_killed_24h: number;
}

async function scrapeAllWorlds() {
  const effectiveDate = getEffectiveKillDate();
  console.log(`Starting scrape for Tibia Day: ${effectiveDate}`);

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await establishSession(page);
    console.log();

    for (const world of WORLDS) {
      try {
        const apiUrl = `https://rubinot.com.br/api/killstats?world=${world.id}`;
        const data = (await fetchApiData(page, apiUrl)) as {
          entries: KillStatsEntry[];
        };

        if (!data.entries || !Array.isArray(data.entries)) {
          console.error(
            `[ERR] ${world.name}: unexpected response — ${JSON.stringify(data).slice(0, 200)}`
          );
          continue;
        }

        const bossEntries = data.entries.filter((e) =>
          BOSS_SET.has(e.race_name)
        );

        for (const boss of bossEntries) {
          await prisma.killRecord.upsert({
            where: {
              worldId_creatureName_effectiveDate: {
                worldId: world.id,
                creatureName: boss.race_name,
                effectiveDate,
              },
            },
            update: {
              kills24h: boss.creatures_killed_24h,
            },
            create: {
              worldId: world.id,
              creatureName: boss.race_name,
              kills24h: boss.creatures_killed_24h,
              effectiveDate,
            },
          });
        }

        console.log(
          `[OK] ${world.name} — ${bossEntries.length} bosses synced`
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[ERR] ${world.name}: ${msg}`);
      }
    }
  } finally {
    await browser.close();
  }
}

scrapeAllWorlds()
  .then(() => {
    console.log("\nScrape complete.");
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
