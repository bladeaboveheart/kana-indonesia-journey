import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ITEMS_PER_LESSON } from '@/domain/srs';
import { createInitialSRSData } from '@/domain/srs/engine';

interface LessonItem {
  id: string;
  type: 'kanji' | 'vocabulary';
  character: string;
  reading: string;
  meaning: string;
  mnemonic: string;
  details?: string;
}

export default function LessonsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [items, setItems] = useState<LessonItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !profile) return;
    loadLessonItems();
  }, [user, profile]);

  async function loadLessonItems() {
    if (!user) return;
    const level = profile?.current_level ?? 1;

    const [kanjiRes, vocabRes, progressRes] = await Promise.all([
      supabase.from('kanji').select('*').eq('level', level),
      supabase.from('vocabulary').select('*').eq('level', level),
      supabase.from('user_progress').select('item_id').eq('user_id', user.id),
    ]);

    const learnedIds = new Set(progressRes.data?.map((p) => p.item_id) ?? []);

    const kanjiItems: LessonItem[] = (kanjiRes.data ?? [])
      .filter((k) => !learnedIds.has(k.id))
      .map((k) => ({
        id: k.id,
        type: 'kanji' as const,
        character: k.character,
        reading: [...(k.onyomi ?? []), ...(k.kunyomi ?? [])].join(', '),
        meaning: k.meaning,
        mnemonic: k.mnemonic,
        details: `On: ${(k.onyomi ?? []).join(', ')} | Kun: ${(k.kunyomi ?? []).join(', ')}`,
      }));

    const vocabItems: LessonItem[] = (vocabRes.data ?? [])
      .filter((v) => !learnedIds.has(v.id))
      .map((v) => ({
        id: v.id,
        type: 'vocabulary' as const,
        character: v.word,
        reading: v.reading,
        meaning: v.meaning,
        mnemonic: v.mnemonic,
        details: v.example_sentence ? `${v.example_sentence} — ${v.example_meaning}` : undefined,
      }));

    const allItems = [...kanjiItems, ...vocabItems].slice(0, ITEMS_PER_LESSON);
    setItems(allItems);
    setLoading(false);
  }

  async function markAsLearned() {
    if (!user || saving) return;
    setSaving(true);

    try {
      const srs = createInitialSRSData();

      for (const item of items) {
        await supabase.from('user_progress').insert({
          user_id: user.id,
          item_id: item.id,
          item_type: item.type,
          srs_stage: srs.stage,
          srs_interval: srs.interval,
          ease_factor: srs.easeFactor,
          next_review_at: srs.nextReviewAt.toISOString(),
          correct_count: 0,
          incorrect_count: 0,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['available-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });

      setFinished(true);
      toast({ title: 'Selesai!', description: `${items.length} item telah dipelajari.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Memuat pelajaran...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg text-foreground">Tidak ada pelajaran baru tersedia 🎉</p>
        <Button onClick={() => navigate('/')}>Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-4xl">🎉</p>
        <p className="text-lg font-semibold text-foreground">
          {items.length} item baru dipelajari!
        </p>
        <p className="text-sm text-muted-foreground">Item ini akan muncul di review nanti.</p>
        <Button onClick={() => navigate('/')}>Kembali ke Dashboard</Button>
      </div>
    );
  }

  const current = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" onClick={() => navigate('/')}>← Kembali</Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {items.length}
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
              {current.type === 'kanji' ? 'Kanji' : 'Kosakata'}
            </div>
            <p className="text-7xl font-bold text-foreground">{current.character}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Bacaan</p>
              <p className="text-xl text-foreground">{current.reading}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arti (Indonesia)</p>
              <p className="text-xl font-semibold text-foreground">{current.meaning}</p>
            </div>
            {current.details && (
              <div>
                <p className="text-sm text-muted-foreground">Detail</p>
                <p className="text-sm text-foreground">{current.details}</p>
              </div>
            )}
            <div className="rounded-lg bg-secondary p-4">
              <p className="text-sm text-muted-foreground">Mnemonic 💡</p>
              <p className="text-sm text-secondary-foreground">{current.mnemonic}</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-3">
          {currentIndex > 0 && (
            <Button variant="outline" onClick={() => setCurrentIndex((i) => i - 1)}>
              Sebelumnya
            </Button>
          )}
          {currentIndex < items.length - 1 ? (
            <Button onClick={() => setCurrentIndex((i) => i + 1)}>Selanjutnya</Button>
          ) : (
            <Button onClick={markAsLearned} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Selesai — Tandai dipelajari'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
