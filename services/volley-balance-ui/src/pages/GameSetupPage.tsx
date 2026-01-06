import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { usePlayers } from '@/hooks/usePlayers';
import { Player, POSITION_SHORT_LABELS } from '@/types/player';
import { generateThreeTeams } from '@/utils/teamGenerator';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Volleyball, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function GameSetupPage() {
  const { data: players, isLoading, error } = usePlayers();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const togglePlayer = (playerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (players) {
      setSelectedIds(new Set(players.map((p) => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleGenerateTeams = () => {
    if (selectedIds.size !== 18) {
      toast.error('Please select exactly 18 players');
      return;
    }

    const selectedPlayers = players?.filter((p) => selectedIds.has(p.id)) || [];
    
    try {
      const result = generateThreeTeams(selectedPlayers);
      // Store result in sessionStorage for teams page
      sessionStorage.setItem('generatedTeams', JSON.stringify(result));
      navigate('/teams');
    } catch (err) {
      toast.error('Failed to generate teams. Please try again.');
    }
  };

  const selectedCount = selectedIds.size;
  const isExactly18 = selectedCount === 18;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Game Setup</h1>
          <p className="text-muted-foreground mt-1">
            Select 18 players to generate balanced teams
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive">Failed to load players</p>
          </div>
        ) : players && players.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Players Selection */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Available Players ({players.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {players.map((player) => {
                    const isSelected = selectedIds.has(player.id);
                    return (
                      <label
                        key={player.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePlayer(player.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{player.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge 
                              variant={player.best_position as any} 
                              className="text-[10px] px-1.5 py-0"
                            >
                              {POSITION_SHORT_LABELS[player.best_position]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {player.overall_rating}
                            </span>
                            <Badge 
                              variant={player.gender === 'female' ? 'female' : 'male'} 
                              className="text-[10px] px-1 py-0"
                            >
                              {player.gender === 'female' ? '♀' : '♂'}
                            </Badge>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selection Summary */}
            <div className="space-y-4">
              <Card className={cn(
                "sticky top-24 transition-all",
                isExactly18 && "ring-2 ring-volleyball-success"
              )}>
                <CardHeader>
                  <CardTitle className="text-lg font-display">Selection Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 rounded-xl bg-muted/50">
                    <span className={cn(
                      "text-5xl font-bold font-display",
                      isExactly18 ? "text-volleyball-success" : selectedCount > 18 ? "text-destructive" : "text-foreground"
                    )}>
                      {selectedCount}
                    </span>
                    <span className="text-2xl font-display text-muted-foreground">/18</span>
                    <p className="text-sm text-muted-foreground mt-2">Players Selected</p>
                  </div>

                  {!isExactly18 && (
                    <Alert variant={selectedCount > 18 ? "destructive" : "default"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {selectedCount < 18 
                          ? `Select ${18 - selectedCount} more player${18 - selectedCount !== 1 ? 's' : ''}`
                          : `Remove ${selectedCount - 18} player${selectedCount - 18 !== 1 ? 's' : ''}`
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  {isExactly18 && (
                    <Alert className="border-volleyball-success bg-volleyball-success/10">
                      <CheckCircle2 className="h-4 w-4 text-volleyball-success" />
                      <AlertDescription className="text-volleyball-success">
                        Ready to generate teams!
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    className="w-full gap-2"
                    size="lg"
                    disabled={!isExactly18}
                    onClick={handleGenerateTeams}
                  >
                    <Volleyball className="h-5 w-5" />
                    Generate 3 Teams
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No players available</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Add players first to set up a game
            </p>
            <Button onClick={() => navigate('/')} className="gap-2">
              <Users className="h-4 w-4" />
              Go to Players
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
