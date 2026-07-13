import fs from 'fs/promises';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'data', 'stats.json');

type Stats = {
  cv_created: number;
  ai_messages: number;
  pdf_uploaded: number;
  ats_tests: number;
  ats_lint_checks: number;
  // AI Optimize token accounting ( Cluster D -40% success metric )
  ai_optimize_prompt_tokens: number;
  ai_optimize_completion_tokens: number;
  ai_optimize_snapshot_tokens: number;
  ai_optimize_full_json_tokens_avoided: number;
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
      ai_optimize_prompt_tokens: 0,
      ai_optimize_completion_tokens: 0,
      ai_optimize_snapshot_tokens: 0,
      ai_optimize_full_json_tokens_avoided: 0,
    };
  }
}

export async function incrementCounter(metric: keyof Stats) {
  await addToCounter(metric, 1);
}

/**
 * Adds an arbitrary delta to a numeric counter.
 * Used for token accounting where each request contributes a variable amount.
 */
export async function addToCounter(metric: keyof Stats, delta: number) {
  try {
    const stats = await getStats();
    stats[metric] = (stats[metric] || 0) + delta;

    // Ensure directory exists
    await fs.mkdir(path.dirname(STATS_FILE), { recursive: true });

    // Write back
    await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (e) {
    // Fail silently in production to not break features
    console.error(`Failed to update stat ${metric}`, e);
  }
}
