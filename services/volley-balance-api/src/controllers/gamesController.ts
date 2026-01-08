import { Request, Response, NextFunction } from 'express';
import { getDbPool } from '../config/database';
import {
  Game,
  GameWithRosters,
  CreateGameWithTeamsDto,
  CreateFeedbackDto,
} from '../models/game';

export class GamesController {
  /**
   * GET /api/games
   * List all games with optional filters
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, from_date, to_date, limit = '50' } = req.query;

      const pool = getDbPool();
      let query = `
        SELECT
          id, game_date, location, description, price_per_player,
          max_players, status, completed_at, auto_completed,
          court_name, notified, created_at, updated_at
        FROM game_schedule
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCounter = 1;

      if (status) {
        query += ` AND status = $${paramCounter}`;
        params.push(status);
        paramCounter++;
      }

      if (from_date) {
        query += ` AND game_date >= $${paramCounter}`;
        params.push(from_date);
        paramCounter++;
      }

      if (to_date) {
        query += ` AND game_date <= $${paramCounter}`;
        params.push(to_date);
        paramCounter++;
      }

      query += ` ORDER BY game_date DESC LIMIT $${paramCounter}`;
      params.push(parseInt(limit as string, 10));

      const result = await pool.query<Game>(query, params);

      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/games/:id
   * Get game details with full rosters
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pool = getDbPool();

      // Get game
      const gameResult = await pool.query<Game>(
        'SELECT * FROM game_schedule WHERE id = $1',
        [id]
      );

      if (gameResult.rows.length === 0) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const game = gameResult.rows[0];

      // Get rosters with players
      const rostersResult = await pool.query(
        `SELECT
          gr.id, gr.game_id, gr.team_number, gr.team_name,
          gr.template_id, gr.average_rating, gr.female_count,
          grp.id as roster_player_id, grp.player_id, grp.position_in_team,
          p.full_name, p.gender, p.overall_rating, p.best_position
        FROM game_rosters gr
        LEFT JOIN game_roster_players grp ON gr.id = grp.roster_id
        LEFT JOIN players_with_overall p ON grp.player_id = p.id
        WHERE gr.game_id = $1
        ORDER BY gr.team_number, grp.position_in_team`,
        [id]
      );

      // Transform to nested structure
      const rostersMap = new Map();

      rostersResult.rows.forEach(row => {
        if (!rostersMap.has(row.id)) {
          rostersMap.set(row.id, {
            id: row.id,
            game_id: row.game_id,
            team_number: row.team_number,
            team_name: row.team_name,
            template_id: row.template_id,
            average_rating: row.average_rating,
            female_count: row.female_count,
            players: [],
          });
        }

        if (row.player_id) {
          rostersMap.get(row.id).players.push({
            id: row.roster_player_id,
            player_id: row.player_id,
            full_name: row.full_name,
            gender: row.gender,
            overall_rating: row.overall_rating,
            best_position: row.best_position,
            position_in_team: row.position_in_team,
          });
        }
      });

      // Get feedback
      const feedbackResult = await pool.query(
        'SELECT * FROM game_feedback WHERE game_id = $1 ORDER BY created_at DESC',
        [id]
      );

      const response: GameWithRosters = {
        ...game,
        rosters: Array.from(rostersMap.values()),
        feedback: feedbackResult.rows,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/games
   * Create game with teams - assigns to next available Friday by default
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateGameWithTeamsDto = req.body;

      // Validation
      if (!dto.location || !dto.teams || dto.teams.length !== 3) {
        res.status(400).json({
          error: 'Missing required fields: location and exactly 3 teams required'
        });
        return;
      }

      // Validate each team has exactly 6 players
      for (const team of dto.teams) {
        if (team.player_ids.length !== 6) {
          res.status(400).json({
            error: `Team ${team.team_name} must have exactly 6 players`
          });
          return;
        }
      }

      const pool = getDbPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get next available Friday or use specific date
        let gameDate: string;
        if (dto.specific_date) {
          gameDate = dto.specific_date;

          // Check if date is available
          const conflictCheck = await client.query(
            `SELECT id FROM game_schedule
             WHERE DATE_TRUNC('day', game_date) = DATE_TRUNC('day', $1::timestamp)
               AND status NOT IN ('cancelled')`,
            [gameDate]
          );

          if (conflictCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            res.status(409).json({
              error: 'A game is already scheduled for this date',
              existing_game_id: conflictCheck.rows[0].id
            });
            return;
          }
        } else {
          const fridayResult = await client.query(
            'SELECT get_next_available_friday() as next_friday'
          );
          const nextFriday = fridayResult.rows[0].next_friday;
          gameDate = `${nextFriday} 19:00:00`; // Default 7 PM
        }

        // Create game
        const gameResult = await client.query<Game>(
          `INSERT INTO game_schedule
           (game_date, location, description, price_per_player, max_players, court_name, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'planned')
           RETURNING *`,
          [
            gameDate,
            dto.location,
            dto.description || null,
            dto.price_per_player || 0,
            dto.max_players || 18,
            dto.court_name || null,
          ]
        );

        const game = gameResult.rows[0];

        // Optionally create team template
        let templateId: number | null = null;
        if (dto.save_as_template && dto.template_name) {
          const templateResult = await client.query(
            `INSERT INTO team_templates (name, description, is_active)
             VALUES ($1, $2, TRUE)
             RETURNING id`,
            [dto.template_name, dto.description || null]
          );
          templateId = templateResult.rows[0].id;
        }

        // Create rosters for each team
        for (const team of dto.teams) {
          const rosterResult = await client.query(
            `INSERT INTO game_rosters
             (game_id, team_number, team_name, template_id, average_rating, female_count)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              game.id,
              team.team_number,
              team.team_name,
              templateId,
              team.average_rating,
              team.female_count,
            ]
          );

          const rosterId = rosterResult.rows[0].id;

          // Add players to roster
          for (let i = 0; i < team.player_ids.length; i++) {
            await client.query(
              `INSERT INTO game_roster_players (roster_id, player_id, position_in_team)
               VALUES ($1, $2, $3)`,
              [rosterId, team.player_ids[i], i + 1]
            );

            // If saving as template, also add to template
            if (templateId) {
              await client.query(
                `INSERT INTO team_template_members (template_id, player_id, position_in_team)
                 VALUES ($1, $2, $3)
                 ON CONFLICT DO NOTHING`,
                [templateId, team.player_ids[i], i + 1]
              );
            }
          }
        }

        await client.query('COMMIT');

        // Return created game with rosters
        const createdGame = await this.getGameWithRosters(pool, game.id);
        res.status(201).json(createdGame);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/games/:id
   * Update game status or details
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, description, location, price_per_player } = req.body;

      const pool = getDbPool();
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramCounter}`);
        values.push(status);
        paramCounter++;

        // If marking as completed, set completed_at
        if (status === 'completed') {
          updates.push(`completed_at = CURRENT_TIMESTAMP`);
        }
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCounter}`);
        values.push(description);
        paramCounter++;
      }

      if (location !== undefined) {
        updates.push(`location = $${paramCounter}`);
        values.push(location);
        paramCounter++;
      }

      if (price_per_player !== undefined) {
        updates.push(`price_per_player = $${paramCounter}`);
        values.push(price_per_player);
        paramCounter++;
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      await pool.query(
        `UPDATE game_schedule SET ${updates.join(', ')} WHERE id = $${paramCounter}`,
        values
      );

      const updatedGame = await this.getGameWithRosters(pool, parseInt(id, 10));
      res.json(updatedGame);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/games/:id/feedback
   * Submit post-game feedback (only allowed for completed games)
   */
  async createFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: CreateFeedbackDto = req.body;

      // Validation
      if (!dto.overall_rating || !dto.balance_rating || !dto.fun_rating) {
        res.status(400).json({
          error: 'Missing required ratings: overall_rating, balance_rating, fun_rating'
        });
        return;
      }

      const pool = getDbPool();

      // Check game exists and is completed
      const gameCheck = await pool.query(
        'SELECT status FROM game_schedule WHERE id = $1',
        [id]
      );

      if (gameCheck.rows.length === 0) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      if (gameCheck.rows[0].status !== 'completed') {
        res.status(403).json({
          error: 'Feedback can only be submitted for completed games',
          current_status: gameCheck.rows[0].status
        });
        return;
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Create feedback
        const feedbackResult = await client.query(
          `INSERT INTO game_feedback
           (game_id, overall_rating, balance_rating, fun_rating, comments, would_play_again)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            id,
            dto.overall_rating,
            dto.balance_rating,
            dto.fun_rating,
            dto.comments || null,
            dto.would_play_again,
          ]
        );

        const feedback = feedbackResult.rows[0];

        // Add player performance notes if provided
        if (dto.player_notes && dto.player_notes.length > 0) {
          for (const note of dto.player_notes) {
            await client.query(
              `INSERT INTO player_performance_notes
               (feedback_id, player_id, performance_rating, notes)
               VALUES ($1, $2, $3, $4)`,
              [feedback.id, note.player_id, note.performance_rating, note.notes || null]
            );
          }
        }

        await client.query('COMMIT');
        res.status(201).json(feedback);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/games/analytics/player-participation
   * Get player participation statistics
   */
  async getPlayerParticipationStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pool = getDbPool();
      const result = await pool.query(
        `SELECT * FROM player_participation_stats
         ORDER BY completed_games DESC, games_played DESC`
      );

      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/games/auto-complete-past
   * Trigger auto-completion of past games
   */
  async autoCompletePast(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pool = getDbPool();
      const result = await pool.query('SELECT * FROM auto_complete_past_games()');

      res.json({
        message: `Auto-completed ${result.rows.length} past games`,
        games: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method
  private async getGameWithRosters(pool: any, gameId: number): Promise<GameWithRosters> {
    const gameResult = await pool.query('SELECT * FROM game_schedule WHERE id = $1', [gameId]);
    const game = gameResult.rows[0];

    const rostersResult = await pool.query(
      `SELECT
        gr.id, gr.game_id, gr.team_number, gr.team_name,
        gr.template_id, gr.average_rating, gr.female_count,
        grp.id as roster_player_id, grp.player_id, grp.position_in_team,
        p.full_name, p.gender, p.overall_rating, p.best_position
      FROM game_rosters gr
      LEFT JOIN game_roster_players grp ON gr.id = grp.roster_id
      LEFT JOIN players_with_overall p ON grp.player_id = p.id
      WHERE gr.game_id = $1
      ORDER BY gr.team_number, grp.position_in_team`,
      [gameId]
    );

    const rostersMap = new Map();
    rostersResult.rows.forEach((row: any) => {
      if (!rostersMap.has(row.id)) {
        rostersMap.set(row.id, {
          id: row.id,
          game_id: row.game_id,
          team_number: row.team_number,
          team_name: row.team_name,
          template_id: row.template_id,
          average_rating: row.average_rating,
          female_count: row.female_count,
          players: [],
        });
      }

      if (row.player_id) {
        rostersMap.get(row.id).players.push({
          id: row.roster_player_id,
          player_id: row.player_id,
          full_name: row.full_name,
          gender: row.gender,
          overall_rating: row.overall_rating,
          best_position: row.best_position,
          position_in_team: row.position_in_team,
        });
      }
    });

    const feedbackResult = await pool.query(
      'SELECT * FROM game_feedback WHERE game_id = $1',
      [gameId]
    );

    return {
      ...game,
      rosters: Array.from(rostersMap.values()),
      feedback: feedbackResult.rows,
    };
  }
}
