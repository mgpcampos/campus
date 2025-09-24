// Lightweight performance instrumentation utilities.
// Replace console.* with a structured logger in production deployments.

const SLOW_THRESHOLD_MS = 200; // adjust as needed

/** Wrap an async function to measure duration */
/**
 * @template T
 * @param {string} label
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function timed(label, fn){
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = performance.now() - start;
    if (dur > SLOW_THRESHOLD_MS) {
      console.warn(`[perf] slow operation '${label}' ${dur.toFixed(1)}ms`);
    }
  }
}

/** Log cache miss if provided flag */
/**
 * @param {string} cacheName
 * @param {string} key
 */
export function logCacheMiss(cacheName, key){
  console.debug(`[cache] miss ${cacheName} -> ${key}`);
}
