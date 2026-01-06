import { Player, POSITION_LABELS } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { User, Edit, Trash2, Calendar, Ruler, MoveHorizontal } from 'lucide-react';

interface SkillBarProps {
  label: string;
  value: number;
  weight: number;
}

function SkillBar({ label, value, weight }: SkillBarProps) {
  // Calculate percentage (70-99 range → 0-100%)
  const percentage = ((value - 70) / 29) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{weight}%</span>
          <span className="text-sm font-bold w-8 text-right">{value}</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface PlayerDetailSheetProps {
  player: Player | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PlayerDetailSheet({ player, open, onClose, onEdit, onDelete }: PlayerDetailSheetProps) {
  if (!player) return null;

  const positionVariant = player.best_position as any;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-left">Player Profile</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">{player.full_name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={positionVariant}>
                  {POSITION_LABELS[player.best_position]}
                </Badge>
                <Badge variant={player.gender === 'female' ? 'female' : 'male'}>
                  {player.gender === 'female' ? 'Female' : 'Male'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center p-6 rounded-xl bg-gradient-to-br from-volleyball-orange/20 to-volleyball-orange/5">
            <div className="text-center">
              <span className="text-5xl font-bold font-display text-volleyball-orange">
                {player.overall_rating}
              </span>
              <p className="text-sm text-muted-foreground mt-1">Overall Rating</p>
            </div>
          </div>

          {/* Skills Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Technical Skills</h3>
            <div className="space-y-3">
              <SkillBar label="Attack" value={player.attack_rating} weight={20} />
              <SkillBar label="Reception" value={player.reception_rating} weight={20} />
              <SkillBar label="Block" value={player.block_rating} weight={15} />
              <SkillBar label="Setting" value={player.setting_rating} weight={15} />
              <SkillBar label="Serve" value={player.serve_rating} weight={15} />
            </div>

            <h3 className="text-sm font-semibold mt-4">Physical & Mental</h3>
            <div className="space-y-3">
              <SkillBar label="Physical" value={player.physical_rating} weight={10} />
              <SkillBar label="Mentality" value={player.mentality_rating} weight={5} />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {player.secondary_position && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Secondary Position</p>
                <Badge variant={player.secondary_position as any} className="mt-1">
                  {POSITION_LABELS[player.secondary_position]}
                </Badge>
              </div>
            )}

            {player.experience_years !== null && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  <p className="text-xs">Experience</p>
                </div>
                <p className="font-semibold">{player.experience_years} years</p>
              </div>
            )}

            {player.height_cm !== null && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Ruler className="h-3 w-3" />
                  <p className="text-xs">Height</p>
                </div>
                <p className="font-semibold">{player.height_cm} cm</p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MoveHorizontal className="h-3 w-3" />
                <p className="text-xs">Preferred Side</p>
              </div>
              <p className="font-semibold capitalize">
                {player.preferred_side.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Notes */}
          {player.notes && (
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Notes</p>
              <p className="text-sm">{player.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button className="flex-1" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Player
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
