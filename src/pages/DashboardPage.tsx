import { useAuth } from '@/features/auth/AuthContext';
import { useProfile, usePendingReviews, useAvailableLessons, useUserProgress } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { STAGE_TO_CATEGORY } from '@/domain/srs';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: pendingReviews } = usePendingReviews();
  const { data: availableLessons } = useAvailableLessons(profile?.current_level ?? 1);
  const { data: allProgress } = useUserProgress();
  const navigate = useNavigate();

  const reviewCount = pendingReviews?.length ?? 0;
  const lessonCount = availableLessons?.totalUnlearned ?? 0;

  // Count items by SRS category
  const categoryCounts = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 };
  allProgress?.forEach((p) => {
    const cat = STAGE_TO_CATEGORY[p.srs_stage as keyof typeof STAGE_TO_CATEGORY];
    if (cat) categoryCounts[cat]++;
  });

  const totalLearned = allProgress?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">🦀 Kanigani</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{profile?.display_name || user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Level indicator */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Level saat ini</p>
          <p className="text-5xl font-bold text-primary">{profile?.current_level ?? 1}</p>
        </div>

        {/* Action cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => lessonCount > 0 && navigate('/lessons')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pelajaran</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{lessonCount}</p>
              <p className="text-sm text-muted-foreground">item tersedia</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => reviewCount > 0 && navigate('/reviews')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{reviewCount}</p>
              <p className="text-sm text-muted-foreground">item perlu direview</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress ({totalLearned} item dipelajari)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {([
              { label: 'Apprentice', key: 'apprentice' as const, color: 'bg-pink-500' },
              { label: 'Guru', key: 'guru' as const, color: 'bg-purple-500' },
              { label: 'Master', key: 'master' as const, color: 'bg-blue-500' },
              { label: 'Enlightened', key: 'enlightened' as const, color: 'bg-emerald-500' },
              { label: 'Burned', key: 'burned' as const, color: 'bg-amber-500' },
            ]).map(({ label, key, color }) => (
              <div key={key} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${color}`} />
                <span className="w-28 text-sm text-foreground">{label}</span>
                <span className="text-sm font-medium text-muted-foreground">{categoryCounts[key]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
