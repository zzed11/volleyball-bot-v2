export type GameStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Game {
  id: number;
  game_date: string;
  location: string;
  description: string | null;
  price_per_player: number;
  max_players: number;
  status: GameStatus;
  completed_at: string | null;
  auto_completed: boolean;
  court_name: string | null;
  notified: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameRosterPlayer {
  id: number;
  player_id: number;
  full_name: string;
  gender: string;
  overall_rating: number;
  best_position: string;
  position_in_team: number;
}

export interface GameRoster {
  id: number;
  game_id: number;
  team_number: number;
  team_name: string;
  template_id: number | null;
  average_rating: number;
  female_count: number;
  players: GameRosterPlayer[];
}

export interface GameFeedback {
  id: number;
  game_id: number;
  overall_rating: number;
  balance_rating: number;
  fun_rating: number;
  comments: string | null;
  would_play_again: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameWithRosters extends Game {
  rosters: GameRoster[];
  feedback?: GameFeedback[];
}

export interface CreateGameWithTeamsDto {
  location: string;
  description?: string;
  price_per_player?: number;
  max_players?: number;
  court_name?: string;
  use_next_friday?: boolean;
  specific_date?: string;
  teams: {
    team_number: number;
    team_name: string;
    player_ids: number[];
    average_rating: number;
    female_count: number;
  }[];
  save_as_template?: boolean;
  template_name?: string;
}

export interface CreateFeedbackDto {
  game_id: number;
  overall_rating: number;
  balance_rating: number;
  fun_rating: number;
  comments?: string;
  would_play_again: boolean;
}

export interface PlayerParticipationStats {
  player_id: number;
  full_name: string;
  gender: string;
  overall_rating: number;
  best_position: string;
  games_played: number;
  completed_games: number;
  avg_team_rating: number;
  first_game_date: string | null;
  last_game_date: string | null;
}
