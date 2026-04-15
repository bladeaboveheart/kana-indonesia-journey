import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useLevelItems(level: number) {
  return useQuery({
    queryKey: ['level-items', level],
    queryFn: async () => {
      const [kanjiRes, vocabRes] = await Promise.all([
        supabase.from('kanji').select('*').eq('level', level),
        supabase.from('vocabulary').select('*').eq('level', level),
      ]);
      if (kanjiRes.error) throw kanjiRes.error;
      if (vocabRes.error) throw vocabRes.error;
      return { kanji: kanjiRes.data, vocabulary: vocabRes.data };
    },
  });
}

export function useUserProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-progress', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function usePendingReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-reviews', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .neq('srs_stage', 'burned')
        .lte('next_review_at', new Date().toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000, // refresh every minute
  });
}

export function useAvailableLessons(level: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-lessons', user?.id, level],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Get all items for current level
      const [kanjiRes, vocabRes, progressRes] = await Promise.all([
        supabase.from('kanji').select('id').eq('level', level),
        supabase.from('vocabulary').select('id').eq('level', level),
        supabase.from('user_progress').select('item_id').eq('user_id', user.id),
      ]);

      if (kanjiRes.error) throw kanjiRes.error;
      if (vocabRes.error) throw vocabRes.error;
      if (progressRes.error) throw progressRes.error;

      const learnedIds = new Set(progressRes.data.map((p) => p.item_id));
      const unlearnedKanji = kanjiRes.data.filter((k) => !learnedIds.has(k.id));
      const unlearnedVocab = vocabRes.data.filter((v) => !learnedIds.has(v.id));

      return {
        unlearnedKanjiCount: unlearnedKanji.length,
        unlearnedVocabCount: unlearnedVocab.length,
        totalUnlearned: unlearnedKanji.length + unlearnedVocab.length,
      };
    },
    enabled: !!user,
  });
}
