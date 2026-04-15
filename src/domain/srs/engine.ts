import type { SRSData, SRSStage } from '../types';
import {
  SRS_INTERVALS,
  SRS_STAGE_ORDER,
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
} from './constants';

/**
 * Create initial SRS data for a newly learned item.
 */
export function createInitialSRSData(): SRSData {
  const stage: SRSStage = 'apprentice_1';
  return {
    stage,
    interval: SRS_INTERVALS[stage],
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReviewAt: new Date(Date.now() + SRS_INTERVALS[stage] * 60 * 60 * 1000),
    correctCount: 0,
    incorrectCount: 0,
  };
}

/**
 * Get the index of a stage in the progression order.
 */
export function getStageIndex(stage: SRSStage): number {
  return SRS_STAGE_ORDER.indexOf(stage);
}

/**
 * Advance to the next SRS stage after a correct answer.
 */
export function getNextStage(currentStage: SRSStage): SRSStage {
  const idx = getStageIndex(currentStage);
  if (idx >= SRS_STAGE_ORDER.length - 1) return currentStage;
  return SRS_STAGE_ORDER[idx + 1];
}

/**
 * Regress to a lower SRS stage after an incorrect answer.
 * Drops back by 2 stages (minimum apprentice_1).
 */
export function getPreviousStage(currentStage: SRSStage): SRSStage {
  const idx = getStageIndex(currentStage);
  const newIdx = Math.max(0, idx - 2);
  return SRS_STAGE_ORDER[newIdx];
}

/**
 * Process a correct answer and return updated SRS data.
 */
export function processCorrectAnswer(current: SRSData): SRSData {
  const newStage = getNextStage(current.stage);
  const newEase = Math.max(
    MIN_EASE_FACTOR,
    current.easeFactor + 0.1
  );
  const interval = SRS_INTERVALS[newStage];

  return {
    stage: newStage,
    interval,
    easeFactor: newEase,
    nextReviewAt: new Date(Date.now() + interval * 60 * 60 * 1000),
    correctCount: current.correctCount + 1,
    incorrectCount: current.incorrectCount,
  };
}

/**
 * Process an incorrect answer and return updated SRS data.
 */
export function processIncorrectAnswer(current: SRSData): SRSData {
  const newStage = getPreviousStage(current.stage);
  const newEase = Math.max(
    MIN_EASE_FACTOR,
    current.easeFactor - 0.2
  );
  const interval = SRS_INTERVALS[newStage];

  return {
    stage: newStage,
    interval,
    easeFactor: newEase,
    nextReviewAt: new Date(Date.now() + interval * 60 * 60 * 1000),
    correctCount: current.correctCount,
    incorrectCount: current.incorrectCount + 1,
  };
}

/**
 * Check if an item is due for review.
 */
export function isDueForReview(srsData: SRSData, now: Date = new Date()): boolean {
  if (srsData.stage === 'burned') return false;
  return now >= srsData.nextReviewAt;
}

/**
 * Check if an item is burned (fully learned).
 */
export function isBurned(srsData: SRSData): boolean {
  return srsData.stage === 'burned';
}
