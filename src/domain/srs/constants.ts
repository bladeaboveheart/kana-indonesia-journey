import type { SRSStage, SRSCategory } from '../types';

/**
 * SRS intervals in hours for each stage.
 * Based on WaniKani-style spacing.
 */
export const SRS_INTERVALS: Record<SRSStage, number> = {
  apprentice_1: 4,       // 4 hours
  apprentice_2: 8,       // 8 hours
  apprentice_3: 24,      // 1 day
  apprentice_4: 48,      // 2 days
  guru_1: 168,           // 1 week
  guru_2: 336,           // 2 weeks
  master: 720,           // 1 month
  enlightened: 2880,     // 4 months
  burned: Infinity,      // done
};

export const SRS_STAGE_ORDER: SRSStage[] = [
  'apprentice_1', 'apprentice_2', 'apprentice_3', 'apprentice_4',
  'guru_1', 'guru_2',
  'master',
  'enlightened',
  'burned',
];

export const STAGE_TO_CATEGORY: Record<SRSStage, SRSCategory> = {
  apprentice_1: 'apprentice',
  apprentice_2: 'apprentice',
  apprentice_3: 'apprentice',
  apprentice_4: 'apprentice',
  guru_1: 'guru',
  guru_2: 'guru',
  master: 'master',
  enlightened: 'enlightened',
  burned: 'burned',
};

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const ITEMS_PER_LESSON = 5;
