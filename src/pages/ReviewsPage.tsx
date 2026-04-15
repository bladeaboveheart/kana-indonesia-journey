import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { processCorrectAnswer, processIncorrectAnswer } from '@/domain/srs/engine';
import { validateMeaningAnswer, validateReadingAnswer } from '@/domain/review';
import { createSessionSummary } from '@/domain/review/session';
import type { ReviewResult, ReviewSessionSummary } from '@/domain/types';

interface ReviewQueueItem {
  progressId: string;
  itemId: string;
  itemType: 'kanji' | 'vocabulary';
  prompt: string;
  questionType: 'meaning' | 'reading';
  correctAnswers: string[];
  srsStage: string;
  srsInterval: number;
  easeFactor: number;
  correctCount: number;
  incorrectCount: number;
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'close' | null>(null);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [summary, setSummary] = useState<ReviewSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    loadReviewItems();
  }, [user]);

  async function loadReviewItems() {
    if (!user) return;

    const { data: progressItems, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .neq('srs_stage', 'burned')
      .lte('next_review_at', new Date().toISOString());

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    if (!progressItems?.length) {
      setLoading(false);
      return;
    }

    // Fetch item details
    const kanjiIds = progressItems.filter((p) => p.item_type === 'kanji').map((p) => p.item_id);
    const vocabIds = progressItems.filter((p) => p.item_type === 'vocabulary').map((p) => p.item_id);

    const [kanjiRes, vocabRes] = await Promise.all([
      kanjiIds.length ? supabase.from('kanji').select('*').in('id', kanjiIds) : { data: [], error: null },
      vocabIds.length ? supabase.from('vocabulary').select('*').in('id', vocabIds) : { data: [], error: null },
    ]);

    const kanjiMap = new Map((kanjiRes.data ?? []).map((k) => [k.id, k]));
    const vocabMap = new Map((vocabRes.data ?? []).map((v) => [v.id, v]));

    const reviewQueue: ReviewQueueItem[] = [];

    for (const progress of progressItems) {
      if (progress.item_type === 'kanji') {
        const kanji = kanjiMap.get(progress.item_id);
        if (!kanji) continue;
        // Meaning question
        reviewQueue.push({
          progressId: progress.id,
          itemId: progress.item_id,
          itemType: 'kanji',
          prompt: kanji.character,
          questionType: 'meaning',
          correctAnswers: [kanji.meaning, ...(kanji.meaning_alt ?? [])],
          srsStage: progress.srs_stage,
          srsInterval: progress.srs_interval,
          easeFactor: progress.ease_factor,
          correctCount: progress.correct_count,
          incorrectCount: progress.incorrect_count,
        });
        // Reading question
        reviewQueue.push({
          progressId: progress.id,
          itemId: progress.item_id,
          itemType: 'kanji',
          prompt: kanji.character,
          questionType: 'reading',
          correctAnswers: [...(kanji.onyomi ?? []), ...(kanji.kunyomi ?? [])],
          srsStage: progress.srs_stage,
          srsInterval: progress.srs_interval,
          easeFactor: progress.ease_factor,
          correctCount: progress.correct_count,
          incorrectCount: progress.incorrect_count,
        });
      } else {
        const vocab = vocabMap.get(progress.item_id);
        if (!vocab) continue;
        reviewQueue.push({
          progressId: progress.id,
          itemId: progress.item_id,
          itemType: 'vocabulary',
          prompt: vocab.word,
          questionType: 'meaning',
          correctAnswers: [vocab.meaning, ...(vocab.meaning_alt ?? [])],
          srsStage: progress.srs_stage,
          srsInterval: progress.srs_interval,
          easeFactor: progress.ease_factor,
          correctCount: progress.correct_count,
          incorrectCount: progress.incorrect_count,
        });
      }
    }

    // Shuffle
    for (let i = reviewQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviewQueue[i], reviewQueue[j]] = [reviewQueue[j], reviewQueue[i]];
    }

    setQueue(reviewQueue);
    setLoading(false);
  }

  const submitAnswer = useCallback(async () => {
    if (!user || feedback) return;
    const current = queue[currentIndex];

    const validation = current.questionType === 'meaning'
      ? validateMeaningAnswer(answer, current.correctAnswers)
      : validateReadingAnswer(answer, current.correctAnswers);

    if (validation.isClose && !validation.isCorrect) {
      setFeedback('close');
      return;
    }

    const isCorrect = validation.isCorrect;
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // Update SRS in database
    const currentSRS = {
      stage: current.srsStage as any,
      interval: current.srsInterval,
      easeFactor: current.easeFactor,
      nextReviewAt: new Date(),
      correctCount: current.correctCount,
      incorrectCount: current.incorrectCount,
    };

    const newSRS = isCorrect
      ? processCorrectAnswer(currentSRS)
      : processIncorrectAnswer(currentSRS);

    await supabase
      .from('user_progress')
      .update({
        srs_stage: newSRS.stage,
        srs_interval: newSRS.interval,
        ease_factor: newSRS.easeFactor,
        next_review_at: newSRS.nextReviewAt.toISOString(),
        correct_count: newSRS.correctCount,
        incorrect_count: newSRS.incorrectCount,
      })
      .eq('id', current.progressId);

    setResults((prev) => [
      ...prev,
      {
        itemId: current.itemId,
        itemType: current.itemType,
        questionType: current.questionType,
        isCorrect,
        userAnswer: answer,
        correctAnswers: current.correctAnswers,
      },
    ]);
  }, [user, feedback, queue, currentIndex, answer]);

  const nextItem = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswer('');
      setFeedback(null);
    } else {
      const finalSummary = createSessionSummary([
        ...results,
      ]);
      setSummary(finalSummary);
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Memuat review...</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-4xl">✨</p>
        <p className="text-lg text-foreground">Tidak ada review tersedia saat ini!</p>
        <Button onClick={() => navigate('/')}>Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <p className="text-4xl">{summary.accuracy >= 80 ? '🎉' : summary.accuracy >= 50 ? '👍' : '💪'}</p>
        <p className="text-2xl font-bold text-foreground">Review Selesai!</p>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-foreground">{summary.totalItems}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-600">{summary.correctCount}</p>
            <p className="text-sm text-muted-foreground">Benar</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-destructive">{summary.incorrectCount}</p>
            <p className="text-sm text-muted-foreground">Salah</p>
          </div>
        </div>
        <p className="text-lg text-muted-foreground">Akurasi: {summary.accuracy.toFixed(0)}%</p>
        <Button onClick={() => navigate('/')}>Kembali ke Dashboard</Button>
      </div>
    );
  }

  const current = queue[currentIndex];
  const progress = ((currentIndex + 1) / queue.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" onClick={() => navigate('/')}>← Kembali</Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {queue.length}
          </span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-2">
        <Progress value={progress} className="h-2" />
      </div>

      <main className="container mx-auto flex flex-col items-center px-4 py-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {current.questionType === 'meaning' ? 'Arti' : 'Bacaan'}
            </div>
            <p className="text-7xl font-bold text-foreground">{current.prompt}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (feedback === 'close') {
                  setFeedback(null);
                  setAnswer('');
                } else if (feedback) {
                  nextItem();
                } else {
                  submitAnswer();
                }
              }}
            >
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={
                  current.questionType === 'meaning'
                    ? 'Ketik artinya dalam Bahasa Indonesia...'
                    : 'Ketik bacaannya...'
                }
                disabled={feedback === 'correct' || feedback === 'incorrect'}
                autoFocus
                className={
                  feedback === 'correct'
                    ? 'border-emerald-500 bg-emerald-50'
                    : feedback === 'incorrect'
                    ? 'border-destructive bg-red-50'
                    : feedback === 'close'
                    ? 'border-amber-500 bg-amber-50'
                    : ''
                }
              />

              {feedback === 'close' && (
                <p className="mt-2 text-sm text-amber-600">Hampir benar! Coba lagi.</p>
              )}
              {feedback === 'incorrect' && (
                <p className="mt-2 text-sm text-destructive">
                  Jawaban benar: {current.correctAnswers[0]}
                </p>
              )}
              {feedback === 'correct' && (
                <p className="mt-2 text-sm text-emerald-600">Benar! 🎉</p>
              )}

              <Button type="submit" className="mt-4 w-full">
                {feedback === 'close'
                  ? 'Coba Lagi'
                  : feedback
                  ? 'Lanjut'
                  : 'Periksa'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
