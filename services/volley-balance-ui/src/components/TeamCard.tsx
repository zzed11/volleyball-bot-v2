import { Team, POSITION_LABELS, POSITION_SHORT_LABELS, PlayerPosition } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamCardProps {
  team: Team;
  index: number;
}

const teamColors = ['teamA', 'teamB', 'teamC'] as const;
const teamBgColors = [
  'from-team-a/10 to-team-a/5',
  'from-team-b/10 to-team-b/5',
  'from-team-c/10 to-team-c/5',
];

export function TeamCard({ team, index }: TeamCardProps) {
  const positions: PlayerPosition[] = ['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'universal'];
  
  return (
    <Card className="overflow-hidden animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
      <CardHeader className={cn(
        "bg-gradient-to-br pb-4",
        teamBgColors[index]
      )}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              index === 0 && "bg-team-a text-primary-foreground",
              index === 1 && "bg-team-b text-accent-foreground",
              index === 2 && "bg-team-c text-primary-foreground"
            )}>
              <Users className="h-5 w-5" />
            </div>
            {team.name}
          </CardTitle>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold font-display">
                {team.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Avg Rating</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Players List */}
        <div className="space-y-2">
          {team.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 bg-card"
            >
              <div className="flex items-center gap-3">
                <Badge variant={player.best_position as any} className="w-8 justify-center">
                  {POSITION_SHORT_LABELS[player.best_position]}
                </Badge>
                <span className="font-medium text-sm">{player.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={player.gender === 'female' ? 'female' : 'male'} className="text-xs">
                  {player.gender === 'female' ? '♀' : '♂'}
                </Badge>
                <span className="font-semibold text-volleyball-orange">
                  {player.overall_rating}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Team Stats */}
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Female Players</span>
              <p className="font-semibold">{team.femaleCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Setters</span>
              <p className="font-semibold">{team.positionCounts.setter}</p>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-1">
            {positions.map((pos) => (
              team.positionCounts[pos] > 0 && (
                <Badge key={pos} variant="outline" className="text-xs">
                  {POSITION_SHORT_LABELS[pos]}: {team.positionCounts[pos]}
                </Badge>
              )
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
