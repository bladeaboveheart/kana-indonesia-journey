/**
 * Answer validation for review sessions.
 * Pure functions — no React dependencies.
 */

/**
 * Normalize a string for comparison:
 * - lowercase
 * - trim whitespace
 * - remove extra spaces
 */
export function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if the user's answer matches any of the correct answers.
 * Uses exact match after normalization.
 */
export function isAnswerCorrect(
  userAnswer: string,
  correctAnswers: string[]
): boolean {
  const normalized = normalizeAnswer(userAnswer);
  if (!normalized) return false;

  return correctAnswers.some(
    (correct) => normalizeAnswer(correct) === normalized
  );
}

/**
 * Calculate Levenshtein distance between two strings.
 * Used for "close but not quite" feedback.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if the answer is close (within tolerance).
 * Useful for showing "almost correct" hints.
 */
export function isAnswerClose(
  userAnswer: string,
  correctAnswers: string[],
  maxDistance: number = 2
): boolean {
  const normalized = normalizeAnswer(userAnswer);
  if (!normalized) return false;

  return correctAnswers.some(
    (correct) =>
      levenshteinDistance(normalized, normalizeAnswer(correct)) <= maxDistance
  );
}

/**
 * Validate a meaning answer (Indonesian translation).
 */
export function validateMeaningAnswer(
  userAnswer: string,
  correctMeanings: string[]
): { isCorrect: boolean; isClose: boolean } {
  const isCorrect = isAnswerCorrect(userAnswer, correctMeanings);
  const isClose = !isCorrect && isAnswerClose(userAnswer, correctMeanings);
  return { isCorrect, isClose };
}

/**
 * Validate a reading answer (hiragana/romaji).
 */
export function validateReadingAnswer(
  userAnswer: string,
  correctReadings: string[]
): { isCorrect: boolean; isClose: boolean } {
  const isCorrect = isAnswerCorrect(userAnswer, correctReadings);
  const isClose = !isCorrect && isAnswerClose(userAnswer, correctReadings, 1);
  return { isCorrect, isClose };
}
