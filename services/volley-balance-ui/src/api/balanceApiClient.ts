import { Player, PlayerGender, PlayerPosition, PlayerPreferredSide } from '@/types/player';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface CreatePlayerDto {
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

  best_position: PlayerPosition;
  secondary_position?: PlayerPosition | null;
  experience_years?: number | null;
  height_cm?: number | null;
  preferred_side?: PlayerPreferredSide;
  notes?: string | null;
  photo_url?: string | null;
}

export interface UpdatePlayerDto extends Partial<CreatePlayerDto> {}

class BalanceApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
  }

  /**
   * Get all players
   */
  async getPlayers(): Promise<Player[]> {
    const response = await fetch(`${this.baseUrl}/players`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch players');
    }
    return response.json();
  }

  /**
   * Get a single player by ID
   */
  async getPlayer(id: number): Promise<Player> {
    const response = await fetch(`${this.baseUrl}/players/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch player');
    }
    return response.json();
  }

  /**
   * Create a new player
   */
  async createPlayer(player: CreatePlayerDto): Promise<Player> {
    const response = await fetch(`${this.baseUrl}/players`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(player),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create player' }));
      throw new Error(error.error || 'Failed to create player');
    }

    return response.json();
  }

  /**
   * Update an existing player
   */
  async updatePlayer(id: number, updates: UpdatePlayerDto): Promise<Player> {
    const response = await fetch(`${this.baseUrl}/players/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update player' }));
      throw new Error(error.error || 'Failed to update player');
    }

    return response.json();
  }

  /**
   * Delete a player
   */
  async deletePlayer(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/players/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete player' }));
      throw new Error(error.error || 'Failed to delete player');
    }
  }
}

export const balanceApi = new BalanceApiClient();
