import { acquire, release } from './browser.js';
import runSeo from './tools/seo.js';
import runPerformance from './tools/performance.js';
import runSecurity from './tools/security.js';
import runAccessibility from './tools/accessibility.js';

const TIMEOUTS = {
  seo: 20000,
  security: 15000,
  performance: 90000,
  accessibility: 45000,
};

export default async function runAudit(url, onProgress) {
  const results = {};
  const browser = await acquire();

  const toolRunners = [
    { name: 'seo', fn: () => runSeo(url) },
    { name: 'security', fn: () => runSecurity(url) },
    { name: 'performance', fn: () => runPerformance(url, browser) },
    { name: 'accessibility', fn: () => runAccessibility(url, browser) },
  ];

  try {
    for (const { name, fn } of toolRunners) {
      onProgress?.(name);
      try {
        results[name] = await withTimeout(fn(), TIMEOUTS[name], name);
      } catch (err) {
        // Graceful degradation: record error but continue with other tools
        console.error(`[AUDIT] Tool "${name}" failed for ${url}: ${err.message}`);
        results[name] = { error: err.message };
      }
    }
  } finally {
    await release();
  }

  return results;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}
