import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamCard } from '@/components/TeamCard';
import { gamesApi } from '@/api/gamesApiClient';
import { GameWithRosters } from '@/types/game';
import { Team } from '@/types/player';
import { ArrowLeft, Calendar, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GameDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameWithRosters | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadGame(parseInt(id, 10));
    }
  }, [id]);

  const loadGame = async (gameId: number) => {
    try {
      setIsLoading(true);
      const data = await gamesApi.getGame(gameId);
      setGame(data);
    } catch (error) {
      console.error('Failed to load game:', error);
      toast.error('Failed to load game details');
      navigate('/game-history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  // Transform rosters to Team format for TeamCard component
  const teams: Team[] = game.rosters.map((roster) => ({
    name: roster.team_name,
    players: roster.players.map((p) => ({
      id: p.player_id,
      full_name: p.full_name,
      gender: p.gender as 'male' | 'female',
      overall_rating: p.overall_rating,
      best_position: p.best_position as any,
      attack_rating: 0,
      reception_rating: 0,
      block_rating: 0,
      setting_rating: 0,
      serve_rating: 0,
      physical_rating: 0,
      mentality_rating: 0,
      secondary_position: null,
      experience_years: null,
      height_cm: null,
      preferred_side: 'no_preference',
      notes: null,
      photo_url: null,
      created_at: '',
      updated_at: '',
    })),
    averageRating: roster.average_rating,
    femaleCount: roster.female_count,
    positionCounts: {
      setter: 0,
      outside_hitter: 0,
      middle_blocker: 0,
      opposite: 0,
      libero: 0,
      universal: 0,
    },
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/game-history')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Button>

        {/* Game Info Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className={game.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                    {game.status}
                  </Badge>
                  <h1 className="text-2xl font-bold font-display">
                    {formatDate(game.game_date)}
                  </h1>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{game.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(game.game_date).toLocaleTimeString()}</span>
                  </div>
                </div>

                {game.description && (
                  <p className="text-sm text-muted-foreground">{game.description}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Teams Display */}
        <div className="grid gap-6 md:grid-cols-3">
          {teams.map((team, index) => (
            <TeamCard key={team.name} team={team} index={index} />
          ))}
        </div>
      </main>
    </div>
  );
}
