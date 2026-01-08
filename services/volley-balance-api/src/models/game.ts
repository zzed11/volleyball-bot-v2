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

export interface GameRoster {
  id: number;
  game_id: number;
  team_number: number;
  team_name: string;
  template_id: number | null;
  average_rating: number;
  female_count: number;
  created_at: string;
}

export interface GameRosterPlayer {
  id: number;
  roster_id: number;
  player_id: number;
  position_in_team: number;
  created_at: string;
}

export interface TeamTemplate {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

// DTOs
export interface CreateGameWithTeamsDto {
  location: string;
  description?: string;
  price_per_player?: number;
  max_players?: number;
  court_name?: string;
  use_next_friday?: boolean; // Default true
  specific_date?: string; // Optional override
  teams: CreateTeamDto[];
  save_as_template?: boolean; // If true, also save teams as reusable template
  template_name?: string; // Required if save_as_template is true
}

export interface CreateTeamDto {
  team_number: number; // 1, 2, or 3
  team_name: string; // "Team A", "Team B", "Team C"
  player_ids: number[]; // Exactly 6 players
  average_rating: number;
  female_count: number;
}

export interface CreateFeedbackDto {
  game_id: number;
  overall_rating: number; // 1-5
  balance_rating: number; // 1-5
  fun_rating: number; // 1-5
  comments?: string;
  would_play_again: boolean;
  player_notes?: {
    player_id: number;
    performance_rating: number;
    notes?: string;
  }[];
}

export interface GameWithRosters extends Game {
  rosters: Array<GameRoster & {
    players: Array<{
      id: number;
      player_id: number;
      full_name: string;
      gender: string;
      overall_rating: number;
      best_position: string;
      position_in_team: number;
    }>;
  }>;
  feedback?: GameFeedback[];
}
