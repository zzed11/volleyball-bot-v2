import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { gamesApi } from '@/api/gamesApiClient';
import { Game, PlayerParticipationStats } from '@/types/game';
import {
  Calendar,
  MapPin,
  Users,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

export default function GameHistoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<PlayerParticipationStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'history' | 'analytics'>('history');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [gamesData, statsData] = await Promise.all([
        gamesApi.getGames({ limit: 50 }),
        gamesApi.getPlayerParticipationStats(),
      ]);
      setGames(gamesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load game history:', error);
      toast.error('Failed to load game history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'planned':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return '';
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Game History</h1>
            <p className="text-muted-foreground mt-1">
              View past games, rosters, and player participation analytics
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'history' ? 'default' : 'outline'}
              onClick={() => setViewMode('history')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              History
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'default' : 'outline'}
              onClick={() => setViewMode('analytics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'history' ? (
          /* Game History View */
          <div className="space-y-4">
            {games.length === 0 ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No games scheduled yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Generate teams and save your first game
                  </p>
                  <Button onClick={() => navigate('/game-setup')}>
                    Set Up Game
                  </Button>
                </CardContent>
              </Card>
            ) : (
              games.map((game) => (
                <Card key={game.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={`gap-1 ${getStatusColor(game.status)}`}>
                            {getStatusIcon(game.status)}
                            {game.status}
                          </Badge>
                          {game.auto_completed && (
                            <Badge variant="outline" className="text-xs">
                              Auto-completed
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatDate(game.game_date)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{game.location}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{game.max_players} players max</span>
                            {game.price_per_player > 0 && (
                              <span>• ₪{game.price_per_player} per player</span>
                            )}
                          </div>

                          {game.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {game.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/game-history/${game.id}`)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Analytics View */
          <Card>
            <CardHeader>
              <CardTitle>Player Participation Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Player</th>
                      <th className="text-center py-3 px-4 font-medium">Gender</th>
                      <th className="text-center py-3 px-4 font-medium">Position</th>
                      <th className="text-center py-3 px-4 font-medium">Rating</th>
                      <th className="text-center py-3 px-4 font-medium">Games Played</th>
                      <th className="text-center py-3 px-4 font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((stat) => (
                      <tr key={stat.player_id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{stat.full_name}</p>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge variant={stat.gender === 'female' ? 'secondary' : 'default'} className="text-xs">
                            {stat.gender}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {stat.best_position}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4 font-semibold">
                          {stat.overall_rating}
                        </td>
                        <td className="text-center py-3 px-4">
                          {stat.games_played}
                        </td>
                        <td className="text-center py-3 px-4">
                          {stat.completed_games}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
