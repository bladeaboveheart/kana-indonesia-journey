// === SRS Types ===

export type SRSStage = 'apprentice_1' | 'apprentice_2' | 'apprentice_3' | 'apprentice_4' | 'guru_1' | 'guru_2' | 'master' | 'enlightened' | 'burned';

export type SRSCategory = 'apprentice' | 'guru' | 'master' | 'enlightened' | 'burned';

export type ItemType = 'kanji' | 'vocabulary';

export interface SRSData {
  stage: SRSStage;
  interval: number; // hours until next review
  easeFactor: number; // SM-2 ease factor (≥1.3)
  nextReviewAt: Date;
  correctCount: number;
  incorrectCount: number;
}

// === Content Types ===

export interface Kanji {
  id: string;
  character: string;
  meaning: string; // Indonesian
  meaningAlt?: string[]; // alternative accepted meanings
  onyomi: string[];
  kunyomi: string[];
  level: number;
  mnemonic: string; // Indonesian mnemonic
}

export interface Vocabulary {
  id: string;
  word: string;
  reading: string;
  meaning: string; // Indonesian
  meaningAlt?: string[];
  kanjiIds: string[];
  level: number;
  mnemonic: string;
  exampleSentence?: string;
  exampleMeaning?: string;
}

export type LearningItem = Kanji | Vocabulary;

// === User Types ===

export interface UserProgress {
  id: string;
  userId: string;
  itemId: string;
  itemType: ItemType;
  srsData: SRSData;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  currentLevel: number;
  createdAt: Date;
}

// === Review Types ===

export type ReviewQuestionType = 'meaning' | 'reading';

export interface ReviewItem {
  itemId: string;
  itemType: ItemType;
  questionType: ReviewQuestionType;
  prompt: string; // the character/word shown
  correctAnswers: string[];
  userProgress: UserProgress;
}

export interface ReviewResult {
  itemId: string;
  itemType: ItemType;
  questionType: ReviewQuestionType;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswers: string[];
}

export interface ReviewSessionSummary {
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  results: ReviewResult[];
}
