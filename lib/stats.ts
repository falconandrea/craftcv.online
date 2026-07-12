import fs from 'fs/promises';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'data', 'stats.json');

type Stats = {
  cv_created: number;
  ai_messages: number;
  pdf_uploaded: number;
  ats_tests: number;
  ats_lint_checks: number;
  [key: string]: number;
};

async function getStats(): Promise<Stats> {
  try {
    const data = await fs.readFile(STATS_FILE, 'utf-8');
    return JSON.parse(data) as Stats;
  } catch {
    // If file doesn't exist or is invalid, return empty defaults
    return {
      cv_created: 0,
      ai_messages: 0,
      pdf_uploaded: 0,
      ats_tests: 0,
      ats_lint_checks: 0,
      jd_analyze: 0,
    };
  }
}

export async function incrementCounter(metric: keyof Stats) {
  try {
    const stats = await getStats();
    stats[metric] = (stats[metric] || 0) + 1;

    // Ensure directory exists
    await fs.mkdir(path.dirname(STATS_FILE), { recursive: true });

    // Write back
    await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (e) {
    // Fail silently in production to not break features
    console.error(`Failed to increment stat ${metric}`, e);
  }
}
