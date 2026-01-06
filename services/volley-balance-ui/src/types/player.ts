export type PlayerGender = 'male' | 'female';

export type PlayerPosition = 
  | 'setter' 
  | 'outside_hitter' 
  | 'middle_blocker' 
  | 'opposite' 
  | 'libero' 
  | 'universal';

export type PlayerPreferredSide = 'left' | 'right' | 'no_preference';

export interface Player {
  id: number; // Changed from string (UUID) to number (PostgreSQL serial)
  full_name: string;
  gender: PlayerGender;

  // Detailed skill ratings (70-99)
  attack_rating: number;
  reception_rating: number;
  block_rating: number;
  setting_rating: number;
  serve_rating: number;
  physical_rating: number;
  mentality_rating: number;

  // Calculated overall rating (weighted average)
  overall_rating: number;

  best_position: PlayerPosition;
  secondary_position: PlayerPosition | null;
  experience_years: number | null;
  height_cm: number | null;
  preferred_side: PlayerPreferredSide;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  name: string;
  players: Player[];
  averageRating: number;
  femaleCount: number;
  positionCounts: Record<PlayerPosition, number>;
}

export interface TeamGenerationResult {
  teams: Team[];
  ratingGap: number;
  balanceQuality: 'excellent' | 'good' | 'fair';
  balanceMessage: string;
}

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  setter: 'Setter',
  outside_hitter: 'Outside Hitter',
  middle_blocker: 'Middle Blocker',
  opposite: 'Opposite',
  libero: 'Libero',
  universal: 'Universal',
};

export const POSITION_SHORT_LABELS: Record<PlayerPosition, string> = {
  setter: 'S',
  outside_hitter: 'OH',
  middle_blocker: 'MB',
  opposite: 'OPP',
  libero: 'L',
  universal: 'U',
};
