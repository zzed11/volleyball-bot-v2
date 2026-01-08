import {
  Game,
  GameWithRosters,
  CreateGameWithTeamsDto,
  CreateFeedbackDto,
  PlayerParticipationStats
} from '@/types/game';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class GamesApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/games`;
  }

  async getGames(filters?: {
    status?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<Game[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch games');
    }

    return response.json();
  }

  async getGame(id: number): Promise<GameWithRosters> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch game');
    }

    return response.json();
  }

  async createGameWithTeams(dto: CreateGameWithTeamsDto): Promise<GameWithRosters> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create game' }));
      throw new Error(error.error || 'Failed to create game');
    }

    return response.json();
  }

  async updateGameStatus(id: number, status: string): Promise<GameWithRosters> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update game');
    }

    return response.json();
  }

  async submitFeedback(dto: CreateFeedbackDto): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${dto.game_id}/feedback`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to submit feedback' }));
      throw new Error(error.error || 'Failed to submit feedback');
    }
  }

  async getPlayerParticipationStats(): Promise<PlayerParticipationStats[]> {
    const response = await fetch(`${this.baseUrl}/analytics/player-participation`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch participation stats');
    }

    return response.json();
  }

  async autoCompletePastGames(): Promise<{ message: string; games: any[] }> {
    const response = await fetch(`${this.baseUrl}/auto-complete-past`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to auto-complete games');
    }

    return response.json();
  }
}

export const gamesApi = new GamesApiClient();
