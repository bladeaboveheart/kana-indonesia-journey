import type { ReviewResult, ReviewSessionSummary } from '../types';

/**
 * Create a review session summary from results.
 */
export function createSessionSummary(
  results: ReviewResult[]
): ReviewSessionSummary {
  const correctCount = results.filter((r) => r.isCorrect).length;
  return {
    totalItems: results.length,
    correctCount,
    incorrectCount: results.length - correctCount,
    accuracy: results.length > 0 ? (correctCount / results.length) * 100 : 0,
    results,
  };
}
