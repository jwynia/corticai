/**
 * Helper for performance tests
 *
 * Performance tests are non-deterministic in CI environments because:
 * - Same code doesn't always get same result
 * - Results depend on environment load/variance
 * - CI timing varies significantly from local
 *
 * Use this helper to automatically skip performance tests in CI
 * while keeping them enabled for local development.
 */

/**
 * Creates a performance test that skips in CI environments
 * @param name - Test name
 * @param fn - Test function
 */
export const itPerformance = process.env.CI === 'true'
  ? it.skip
  : it;

/**
 * Creates a performance describe block
 * Note: Individual tests within still need to use itPerformance
 */
export const describePerformance = describe;
