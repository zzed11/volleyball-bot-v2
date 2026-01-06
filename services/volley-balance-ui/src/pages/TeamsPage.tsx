import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TeamCard } from '@/components/TeamCard';
import { TeamGenerationResult } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volleyball, RefreshCw, ListChecks, TrendingUp, Users, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeamsPage() {
  const [result, setResult] = useState<TeamGenerationResult | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('generatedTeams');
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        setResult(null);
      }
    }
  }, []);

  const handleNewGame = () => {
    sessionStorage.removeItem('generatedTeams');
    navigate('/game-setup');
  };

  const qualityConfig = {
    excellent: {
      color: 'text-volleyball-success',
      bgColor: 'bg-volleyball-success/10 border-volleyball-success/30',
      icon: CheckCircle2,
    },
    good: {
      color: 'text-volleyball-warning',
      bgColor: 'bg-volleyball-warning/10 border-volleyball-warning/30',
      icon: Info,
    },
    fair: {
      color: 'text-volleyball-orange',
      bgColor: 'bg-volleyball-orange/10 border-volleyball-orange/30',
      icon: AlertCircle,
    },
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Volleyball className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No teams generated yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Select players and generate teams first
            </p>
            <Button onClick={() => navigate('/game-setup')} className="gap-2">
              <ListChecks className="h-4 w-4" />
              Go to Game Setup
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const config = qualityConfig[result.balanceQuality];
  const QualityIcon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Generated Teams</h1>
            <p className="text-muted-foreground mt-1">
              3 balanced teams ready to play
            </p>
          </div>
          <Button onClick={handleNewGame} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            New Game
          </Button>
        </div>

        {/* Balance Summary */}
        <Card className={cn("mb-8 border", config.bgColor)}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", config.bgColor)}>
                  <QualityIcon className={cn("h-6 w-6", config.color)} />
                </div>
                <div>
                  <Badge 
                    variant="outline" 
                    className={cn("mb-1 capitalize font-semibold", config.color)}
                  >
                    {result.balanceQuality} Balance
                  </Badge>
                  <p className="text-sm text-muted-foreground">{result.balanceMessage}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 md:ml-auto">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rating Gap</p>
                    <p className="font-semibold">{result.ratingGap} pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Female/Team</p>
                    <p className="font-semibold">
                      {result.teams.map(t => t.femaleCount).join(' / ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {result.teams.map((team, index) => (
            <TeamCard key={team.name} team={team} index={index} />
          ))}
        </div>

        {/* Team Comparison */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-display">Team Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Metric</th>
                    {result.teams.map((team, idx) => (
                      <th key={team.name} className="text-center py-3 px-4 font-medium">
                        <Badge variant={['teamA', 'teamB', 'teamC'][idx] as any}>
                          {team.name}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">Average Rating</td>
                    {result.teams.map((team) => (
                      <td key={team.name} className="text-center py-3 px-4 font-semibold">
                        {team.averageRating.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">Female Players</td>
                    {result.teams.map((team) => (
                      <td key={team.name} className="text-center py-3 px-4 font-semibold">
                        {team.femaleCount}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">Setters</td>
                    {result.teams.map((team) => (
                      <td key={team.name} className="text-center py-3 px-4 font-semibold">
                        {team.positionCounts.setter}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">Outside Hitters</td>
                    {result.teams.map((team) => (
                      <td key={team.name} className="text-center py-3 px-4 font-semibold">
                        {team.positionCounts.outside_hitter}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-muted-foreground">Middle Blockers</td>
                    {result.teams.map((team) => (
                      <td key={team.name} className="text-center py-3 px-4 font-semibold">
                        {team.positionCounts.middle_blocker}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
