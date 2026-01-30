import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TeamCard } from '@/components/TeamCard';
import { TeamGenerationResult } from '@/types/player';
import { generateThreeTeams } from '@/utils/teamGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Volleyball, ListChecks, TrendingUp, Users, CheckCircle2, AlertCircle, Info, Save, Calendar, Loader2, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gamesApi } from '@/api/gamesApiClient';
import { CreateGameWithTeamsDto } from '@/types/game';
import { toast } from 'sonner';

export default function TeamsPage() {
  const [result, setResult] = useState<TeamGenerationResult | null>(null);
  const [keepAVTogether, setKeepAVTogether] = useState(false);
  const navigate = useNavigate();

  // Save & Schedule state
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [location, setLocation] = useState('Sport Complex');
  const [nextFridayDate, setNextFridayDate] = useState<string>('');

  useEffect(() => {
    const stored = sessionStorage.getItem('generatedTeams');
    const storedAV = sessionStorage.getItem('keepAVTogether');
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        setResult(null);
      }
    }
    if (storedAV) {
      setKeepAVTogether(storedAV === 'true');
    }
  }, []);

  // Calculate next Friday preview
  useEffect(() => {
    const getNextFriday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
      const nextFriday = new Date(today);
      nextFriday.setDate(today.getDate() + daysUntilFriday);
      return nextFriday.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    setNextFridayDate(getNextFriday());
  }, []);

  const handleReshuffleTeams = () => {
    if (!result) return;

    try {
      // Get all 18 players from current teams
      const allPlayers = result.teams.flatMap(team => team.players);

      // Regenerate teams with the same players, preserving A&V option
      const newResult = generateThreeTeams(allPlayers, { keepAVTogether });

      // Update state and session storage
      setResult(newResult);
      sessionStorage.setItem('generatedTeams', JSON.stringify(newResult));

      toast.success('Teams reshuffled successfully!', {
        description: `New balance: ${newResult.balanceQuality}`
      });
    } catch (error) {
      console.error('Failed to reshuffle teams:', error);
      toast.error('Failed to reshuffle teams. Please try again.');
    }
  };

  const handleToggleAV = (checked: boolean) => {
    setKeepAVTogether(checked);
    sessionStorage.setItem('keepAVTogether', String(checked));
  };

  const handleSaveAndProceed = async () => {
    if (!result) return;

    if (saveAsTemplate && !templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setIsSaving(true);

    try {
      const dto: CreateGameWithTeamsDto = {
        location,
        description: `3-team game - ${result.balanceQuality} balance`,
        price_per_player: 50,
        max_players: 18,
        use_next_friday: true,
        teams: result.teams.map((team, idx) => ({
          team_number: idx + 1,
          team_name: team.name,
          player_ids: team.players.map(p => p.id),
          average_rating: team.averageRating,
          female_count: team.femaleCount,
        })),
        save_as_template: saveAsTemplate,
        template_name: saveAsTemplate ? templateName : undefined,
      };

      const createdGame = await gamesApi.createGameWithTeams(dto);

      toast.success(
        `Game scheduled for ${new Date(createdGame.game_date).toLocaleDateString()}!`,
        { description: saveAsTemplate ? 'Teams saved as template' : undefined }
      );

      // Clear session storage and navigate to game history
      sessionStorage.removeItem('generatedTeams');
      navigate('/game-history');

    } catch (error: any) {
      console.error('Failed to save game:', error);
      toast.error(error.message || 'Failed to schedule game');
    } finally {
      setIsSaving(false);
    }
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
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="av-toggle"
                checked={keepAVTogether}
                onCheckedChange={(checked) => handleToggleAV(checked as boolean)}
              />
              <Label htmlFor="av-toggle" className="text-sm font-normal cursor-pointer">
                A&V
              </Label>
            </div>
            <Button onClick={handleReshuffleTeams} variant="outline" className="gap-2">
              <Shuffle className="h-4 w-4" />
              Reshuffle Teams
            </Button>
          </div>
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

        {/* Save & Schedule Game Card */}
        <Card className="mt-8 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-display flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save & Schedule Game
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Next Friday Preview */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Game will be scheduled for</p>
                <p className="text-lg font-semibold text-foreground">{nextFridayDate}</p>
              </div>
            </div>

            {/* Location Input */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Sport Complex Hall A"
              />
            </div>

            {/* Save as Template Option */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-template"
                  checked={saveAsTemplate}
                  onCheckedChange={(checked) => setSaveAsTemplate(checked as boolean)}
                />
                <Label
                  htmlFor="save-template"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Save teams as reusable template
                </Label>
              </div>

              {saveAsTemplate && (
                <Input
                  placeholder="Template name (e.g., Balanced Mix Jan 2025)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              )}
            </div>

            {/* Action Buttons */}
            <Button
              onClick={handleSaveAndProceed}
              disabled={isSaving || !location.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save & Schedule Game
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
