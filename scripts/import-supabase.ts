import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

const WORLD_NAME_TO_ID: Record<string, number> = {
  Elysian: 1,
  Lunarian: 9,
  Spectrum: 10,
  Auroria: 11,
  Solarian: 12,
  Belaria: 15,
  Vesperia: 16,
  Bellum: 17,
  Mystian: 18,
  Tenebrium: 21,
  Serenian: 22,
  "Serenian II": 23,
  "Serenian III": 24,
  "Serenian IV": 25,
};

function convertDate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

interface SupabaseKillRecord {
  id: number;
  boss_name: string;
  world: string;
  date: string;
  count: number;
}

async function importData() {
  const filePath = resolve(__dirname, "..", "supabase_export.json");
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const records: SupabaseKillRecord[] = data.tables.kill_history.data;
  console.log(`Found ${records.length} kill_history records to import`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const operations = batch
      .map((record) => {
        const worldId = WORLD_NAME_TO_ID[record.world];
        if (!worldId) {
          skipped++;
          return null;
        }

        const effectiveDate = convertDate(record.date);

        return prisma.killRecord.upsert({
          where: {
            worldId_creatureName_effectiveDate: {
              worldId,
              creatureName: record.boss_name,
              effectiveDate,
            },
          },
          update: {
            kills24h: record.count,
          },
          create: {
            worldId,
            creatureName: record.boss_name,
            kills24h: record.count,
            effectiveDate,
          },
        });
      })
      .filter(Boolean);

    try {
      await prisma.$transaction(operations as never[]);
      imported += operations.length;
    } catch (err) {
      for (const op of operations) {
        try {
          await (op as ReturnType<typeof prisma.killRecord.upsert>);
          imported++;
        } catch {
          errors++;
        }
      }
    }

    const pct = Math.round(((i + batch.length) / records.length) * 100);
    process.stdout.write(`\r  ${pct}% (${imported} imported, ${skipped} skipped, ${errors} errors)`);
  }

  console.log(`\n\nDone! ${imported} records imported, ${skipped} skipped, ${errors} errors`);
}

importData()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Import failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
