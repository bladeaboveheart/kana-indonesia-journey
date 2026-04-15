

# Kanigani — Japanese Learning App for Indonesian Learners

## Overview
A clean, minimal web app with SRS-based kanji and vocabulary learning. WaniKani-inspired design with Indonesian translations. Strict domain/UI separation for future React Native reuse.

## Architecture

**`src/domain/`** — Pure TypeScript, no React dependencies:
- `srs/` — SRS engine (SM-2 algorithm: interval calculation, level progression)
- `review/` — Answer validation (romaji/hiragana matching, fuzzy tolerance)
- `types/` — Shared types (Kanji, Vocabulary, ReviewItem, SRSData, UserProgress)

**`src/features/`** — React feature modules:
- `auth/` — Login/signup pages
- `dashboard/` — Progress overview
- `lessons/` — Learn new items flow
- `reviews/` — SRS review session

**`src/components/`** — Shared UI components (cards, progress bars, layout)

## Database (Supabase + Lovable Cloud)

**Tables:**
- `profiles` — user display name, current level
- `kanji` — character, meaning (Indonesian), readings, level, mnemonics
- `vocabulary` — word, reading, meaning (Indonesian), associated kanji, level
- `user_progress` — user_id, item_id, item_type, SRS stage, next_review_at, interval, ease_factor
- `user_roles` — role-based access (per security guidelines)

**Seed data:** ~30 items across 2 levels with Indonesian meanings and mnemonics.

## Core Features

### 1. Authentication
- Email/password signup & login via Supabase Auth
- Auto-create profile on signup
- Protected routes

### 2. Dashboard
- Current level, items learned count
- Pending reviews count & next review time
- Lesson availability indicator
- Simple progress bars per level

### 3. Lessons
- Sequential card-based flow showing kanji/vocab
- Display: character, reading, Indonesian meaning, mnemonic
- Mark items as "learned" → creates initial SRS entry
- Batch of 5 items per lesson session

### 4. Reviews (SRS)
- Pull due items (next_review_at ≤ now)
- Show character → user types meaning or reading
- Answer validation via domain layer (fuzzy match)
- SRS update: correct → increase interval, wrong → decrease
- Session summary at end

### 5. SRS Engine (Domain Layer)
- SM-2 inspired algorithm
- Stages: Apprentice → Guru → Master → Enlightened → Burned
- Pure functions, fully testable, no React dependency

## Design
- Light/white theme, clean typography
- Card-based layouts with generous whitespace
- Color-coded SRS stages (pink→purple→blue→green→gold)
- Mobile-responsive

## Implementation Order
1. Project structure + domain types + SRS logic
2. Supabase setup (tables, RLS, seed data)
3. Auth flow
4. Dashboard page
5. Lessons feature
6. Reviews feature
7. Polish & connect everything

