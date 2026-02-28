import { BossKillHistory, KillDateEntry } from '@/types';

export interface SpawnPrediction {
    bossName: string;
    nextSpawnDate: Date;
    averageInterval: number;
    lastKillDate: Date;
    isOverdue: boolean;
    daysUntil: number;
    totalKills: number;
    intervals: number[];
}

export function calculateSpawnPrediction(
    bossName: string,
    history: KillDateEntry[],
    totalKills: number
): SpawnPrediction | null {
    if (!history || history.length < 2) {
        return null;
    }

    // 1. Sort dates ascending
    const sortedDates = [...history]
        .map(h => {
            const [day, month, year] = h.date.split('/').map(Number);
            return new Date(year, month - 1, day);
        })
        .sort((a, b) => a.getTime() - b.getTime());

    // 2. Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
        const diffTime = Math.abs(sortedDates[i].getTime() - sortedDates[i - 1].getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        intervals.push(diffDays);
    }

    if (intervals.length === 0) return null;

    // 3. Calculate Average Interval (Simple Arithmetic Mean)
    const totalInterval = intervals.reduce((sum, val) => sum + val, 0);
    const averageInterval = totalInterval / intervals.length;

    // 4. Calculate Next Spawn
    const lastKillDate = sortedDates[sortedDates.length - 1];
    const nextSpawnTime = lastKillDate.getTime() + (averageInterval * 24 * 60 * 60 * 1000);
    const nextSpawnDate = new Date(nextSpawnTime);

    // 5. Calculate Status
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Normalize nextSpawnDate to midnight for comparison
    const nextSpawnMidnight = new Date(nextSpawnDate.getFullYear(), nextSpawnDate.getMonth(), nextSpawnDate.getDate());

    const diffTime = nextSpawnMidnight.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntil < 0;

    return {
        bossName,
        nextSpawnDate,
        averageInterval,
        lastKillDate,
        isOverdue,
        daysUntil,
        totalKills,
        intervals
    };
}

export function getUpcomingBosses(
    killDates: BossKillHistory[],
    worldName?: string
): SpawnPrediction[] {
    const predictions: SpawnPrediction[] = [];

    killDates.forEach(boss => {
        let history: KillDateEntry[] = [];
        let kills = 0;

        if (worldName) {
            // Get history for specific world
            history = boss.killsByWorld[worldName] || [];
            kills = history.reduce((sum, h) => sum + h.count, 0);
        } else {
            // Not used for "All Servers" logic in page.tsx
            return;
        }

        const prediction = calculateSpawnPrediction(boss.bossName, history, kills);
        if (prediction) {
            predictions.push(prediction);
        }
    });

    return predictions.sort((a, b) => a.nextSpawnDate.getTime() - b.nextSpawnDate.getTime());
}

export interface WorldBossPrediction extends SpawnPrediction {
    worldName: string;
}

export function getAllUpcomingBosses(killDates: BossKillHistory[]): WorldBossPrediction[] {
    const allPredictions: WorldBossPrediction[] = [];

    killDates.forEach(boss => {
        Object.entries(boss.killsByWorld).forEach(([world, history]) => {
            const kills = history.reduce((sum, h) => sum + h.count, 0);
            const pred = calculateSpawnPrediction(boss.bossName, history, kills);
            if (pred) {
                allPredictions.push({
                    ...pred,
                    worldName: world
                });
            }
        });
    });

    return allPredictions.sort((a, b) => a.nextSpawnDate.getTime() - b.nextSpawnDate.getTime());
}
