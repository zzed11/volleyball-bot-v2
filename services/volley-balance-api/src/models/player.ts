export type PlayerGender = 'male' | 'female';

export type PlayerPosition =
  | 'setter'
  | 'outside_hitter'
  | 'middle_blocker'
  | 'opposite'
  | 'libero'
  | 'universal';

export type PlayerPreferredSide = 'left' | 'right' | 'no_preference';

/**
 * Player entity from database (includes calculated overall_rating from view)
 */
export interface Player {
  id: number;
  full_name: string;
  gender: PlayerGender;

  // Individual skill ratings (70-99)
  attack_rating: number;
  reception_rating: number;
  block_rating: number;
  setting_rating: number;
  serve_rating: number;
  physical_rating: number;
  mentality_rating: number;

  // Calculated overall rating (weighted average)
  overall_rating: number; // 70-99

  best_position: PlayerPosition;
  secondary_position: PlayerPosition | null;
  experience_years: number | null;
  height_cm: number | null;
  preferred_side: PlayerPreferredSide;
  notes: string | null;
  photo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO for creating a new player
 */
export interface CreatePlayerDto {
  full_name: string;
  gender: PlayerGender;

  // Individual skill ratings (70-99) - all required
  attack_rating: number;
  reception_rating: number;
  block_rating: number;
  setting_rating: number;
  serve_rating: number;
  physical_rating: number;
  mentality_rating: number;

  best_position: PlayerPosition;
  secondary_position?: PlayerPosition | null;
  experience_years?: number | null;
  height_cm?: number | null;
  preferred_side?: PlayerPreferredSide;
  notes?: string | null;
  photo_url?: string | null;
}

/**
 * DTO for updating an existing player
 */
export interface UpdatePlayerDto extends Partial<CreatePlayerDto> {}

/**
 * Validate player rating is within allowed range
 */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 70 && rating <= 99;
}

/**
 * Validate player position is a valid enum value
 */
export function isValidPosition(position: string): position is PlayerPosition {
  const validPositions: PlayerPosition[] = [
    'setter',
    'outside_hitter',
    'middle_blocker',
    'opposite',
    'libero',
    'universal'
  ];
  return validPositions.includes(position as PlayerPosition);
}

/**
 * Validate player gender is a valid enum value
 */
export function isValidGender(gender: string): gender is PlayerGender {
  return gender === 'male' || gender === 'female';
}
