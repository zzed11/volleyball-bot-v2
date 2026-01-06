import { Player, POSITION_LABELS, POSITION_SHORT_LABELS } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SkillBarProps {
  label: string;
  value: number;
}

function SkillBar({ label, value }: SkillBarProps) {
  // Calculate percentage (70-99 range → 0-100%)
  const percentage = ((value - 70) / 29) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium w-6 text-right">{value}</span>
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  compact?: boolean;
  showActions?: boolean;
}

export function PlayerCard({ player, onEdit, onDelete, onClick, compact = false, showActions = true }: PlayerCardProps) {
  const positionVariant = player.best_position as any;

  if (compact) {
    return (
      <div 
        className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{player.full_name}</p>
            <div className="flex items-center gap-2">
              <Badge variant={positionVariant} className="text-[10px] px-1.5 py-0">
                {POSITION_SHORT_LABELS[player.best_position]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {player.overall_rating}
              </span>
            </div>
          </div>
        </div>
        <Badge variant={player.gender === 'female' ? 'female' : 'male'} className="text-xs">
          {player.gender === 'female' ? '♀' : '♂'}
        </Badge>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-volleyball cursor-pointer",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{player.full_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={positionVariant}>
                  {POSITION_LABELS[player.best_position]}
                </Badge>
                <Badge variant={player.gender === 'female' ? 'female' : 'male'}>
                  {player.gender === 'female' ? 'Female' : 'Male'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold font-display text-volleyball-orange">
                {player.overall_rating}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Overall</span>
          </div>
        </div>

        {/* Skills Breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          <SkillBar label="Attack" value={player.attack_rating} />
          <SkillBar label="Reception" value={player.reception_rating} />
          <SkillBar label="Block" value={player.block_rating} />
          <SkillBar label="Setting" value={player.setting_rating} />
          <SkillBar label="Serve" value={player.serve_rating} />
          <SkillBar label="Physical" value={player.physical_rating} />
          <SkillBar label="Mentality" value={player.mentality_rating} />
        </div>

        {showActions && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
