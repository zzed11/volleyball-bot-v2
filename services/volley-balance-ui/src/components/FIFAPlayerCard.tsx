import { Player, POSITION_SHORT_LABELS } from '@/types/player';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FIFAPlayerCardProps {
  player: Player;
  onClick?: () => void;
  variant?: 'gold' | 'special' | 'icon';
}

export function FIFAPlayerCard({ player, onClick, variant = 'gold' }: FIFAPlayerCardProps) {
  // Card color schemes
  const cardStyles = {
    gold: 'from-yellow-600 via-yellow-500 to-yellow-600',
    special: 'from-purple-600 via-purple-500 to-purple-600',
    icon: 'from-orange-600 via-orange-500 to-orange-600',
  };

  const cardGlow = {
    gold: 'shadow-yellow-500/50',
    special: 'shadow-purple-500/50',
    icon: 'shadow-orange-500/50',
  };

  return (
    <Card
      className={cn(
        'relative w-[280px] h-[400px] overflow-hidden cursor-pointer transition-all hover:scale-105',
        'bg-gradient-to-br',
        cardStyles[variant],
        'shadow-2xl',
        cardGlow[variant],
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Card Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-32 -translate-x-32" />
      </div>

      <div className="relative h-full p-4 flex flex-col text-white">
        {/* Top Section - Rating & Position */}
        <div className="flex items-start gap-3 mb-2">
          <div className="flex flex-col items-center">
            <div className="text-5xl font-black leading-none font-display drop-shadow-lg">
              {player.overall_rating}
            </div>
            <div className="text-xs font-bold mt-1 bg-black/30 px-2 py-0.5 rounded">
              {POSITION_SHORT_LABELS[player.best_position]}
            </div>
          </div>

          {/* Player Avatar */}
          <div className="flex-1 flex justify-center items-center">
            <div className="relative w-32 h-32 mt-4">
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/30">
                <User className="h-16 w-16 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Player Name */}
        <div className="text-center mt-auto mb-3">
          <div className="text-xl font-black uppercase tracking-wide drop-shadow-lg">
            {player.full_name}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
          <StatItem label="ATK" value={player.attack_rating} />
          <StatItem label="REC" value={player.reception_rating} />
          <StatItem label="BLK" value={player.block_rating} />
          <StatItem label="SET" value={player.setting_rating} />
          <StatItem label="SRV" value={player.serve_rating} />
          <StatItem label="PHY" value={player.physical_rating} />
        </div>

        {/* Gender Badge */}
        <div className="absolute top-4 right-4">
          <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-sm font-bold border border-white/20">
            {player.gender === 'female' ? '♀' : '♂'}
          </div>
        </div>

        {/* Card Type Label */}
        <div className="absolute bottom-4 right-4">
          <div className="text-[10px] font-bold uppercase tracking-wider bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/20">
            {variant === 'icon' ? 'Icon' : variant === 'special' ? 'Special' : 'Rare'}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xl font-black leading-none drop-shadow">
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wide mt-0.5 opacity-90">
        {label}
      </div>
    </div>
  );
}
