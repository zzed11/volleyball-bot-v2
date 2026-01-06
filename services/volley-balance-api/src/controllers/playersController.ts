import { Request, Response, NextFunction } from 'express';
import { getDbPool } from '../config/database';
import {
  Player,
  CreatePlayerDto,
  UpdatePlayerDto,
  isValidRating,
  isValidPosition,
  isValidGender,
} from '../models/player';

export class PlayersController {
  /**
   * Get all players for volleyball (filters out Telegram-only players)
   * Uses players_with_overall view to include calculated overall_rating
   */
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pool = getDbPool();
      const result = await pool.query<Player>(
        `SELECT id, full_name, gender,
                attack_rating, reception_rating, block_rating,
                setting_rating, serve_rating, physical_rating, mentality_rating,
                overall_rating, best_position, secondary_position,
                experience_years, height_cm, preferred_side, notes, photo_url,
                created_at, updated_at
         FROM players_with_overall
         WHERE full_name IS NOT NULL
         ORDER BY full_name ASC`
      );

      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single player by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pool = getDbPool();

      const result = await pool.query<Player>(
        `SELECT id, full_name, gender,
                attack_rating, reception_rating, block_rating,
                setting_rating, serve_rating, physical_rating, mentality_rating,
                overall_rating, best_position, secondary_position,
                experience_years, height_cm, preferred_side, notes, photo_url,
                created_at, updated_at
         FROM players_with_overall
         WHERE id = $1 AND full_name IS NOT NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new player with detailed skill ratings
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreatePlayerDto = req.body;

      // Validation
      if (!dto.full_name || !dto.gender || !dto.best_position) {
        res.status(400).json({
          error: 'Missing required fields: full_name, gender, best_position'
        });
        return;
      }

      // Validate all skill ratings
      const requiredRatings = [
        'attack_rating', 'reception_rating', 'block_rating',
        'setting_rating', 'serve_rating', 'physical_rating', 'mentality_rating'
      ];

      for (const field of requiredRatings) {
        const value = (dto as any)[field];
        if (value === undefined) {
          res.status(400).json({ error: `Missing required field: ${field}` });
          return;
        }
        if (!isValidRating(value)) {
          res.status(400).json({
            error: `${field} must be an integer between 70 and 99`
          });
          return;
        }
      }

      if (!isValidGender(dto.gender)) {
        res.status(400).json({
          error: 'Gender must be either "male" or "female"'
        });
        return;
      }

      if (!isValidPosition(dto.best_position)) {
        res.status(400).json({
          error: 'Invalid best_position value'
        });
        return;
      }

      if (dto.secondary_position && !isValidPosition(dto.secondary_position)) {
        res.status(400).json({
          error: 'Invalid secondary_position value'
        });
        return;
      }

      const pool = getDbPool();
      const result = await pool.query<Player>(
        `INSERT INTO players
         (full_name, gender, attack_rating, reception_rating, block_rating,
          setting_rating, serve_rating, physical_rating, mentality_rating,
          best_position, secondary_position, experience_years, height_cm,
          preferred_side, notes, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          dto.full_name,
          dto.gender,
          dto.attack_rating,
          dto.reception_rating,
          dto.block_rating,
          dto.setting_rating,
          dto.serve_rating,
          dto.physical_rating,
          dto.mentality_rating,
          dto.best_position,
          dto.secondary_position || null,
          dto.experience_years || null,
          dto.height_cm || null,
          dto.preferred_side || 'no_preference',
          dto.notes || null,
          dto.photo_url || null,
        ]
      );

      // Fetch with calculated overall_rating from view
      const playerWithOverall = await pool.query<Player>(
        `SELECT * FROM players_with_overall WHERE id = $1`,
        [result.rows[0].id]
      );

      res.status(201).json(playerWithOverall.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing player
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePlayerDto = req.body;

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      // Validate and add fields to update
      if (dto.full_name !== undefined) {
        updates.push(`full_name = $${paramCounter}`);
        values.push(dto.full_name);
        paramCounter++;
      }

      if (dto.gender !== undefined) {
        if (!isValidGender(dto.gender)) {
          res.status(400).json({ error: 'Invalid gender value' });
          return;
        }
        updates.push(`gender = $${paramCounter}`);
        values.push(dto.gender);
        paramCounter++;
      }

      // Individual skill ratings
      const ratingFields = [
        'attack_rating', 'reception_rating', 'block_rating',
        'setting_rating', 'serve_rating', 'physical_rating', 'mentality_rating'
      ];

      for (const field of ratingFields) {
        const value = (dto as any)[field];
        if (value !== undefined) {
          if (!isValidRating(value)) {
            res.status(400).json({
              error: `${field} must be an integer between 70 and 99`
            });
            return;
          }
          updates.push(`${field} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        }
      }

      if (dto.best_position !== undefined) {
        if (!isValidPosition(dto.best_position)) {
          res.status(400).json({ error: 'Invalid best_position value' });
          return;
        }
        updates.push(`best_position = $${paramCounter}`);
        values.push(dto.best_position);
        paramCounter++;
      }

      if (dto.secondary_position !== undefined) {
        if (dto.secondary_position !== null && !isValidPosition(dto.secondary_position)) {
          res.status(400).json({ error: 'Invalid secondary_position value' });
          return;
        }
        updates.push(`secondary_position = $${paramCounter}`);
        values.push(dto.secondary_position);
        paramCounter++;
      }

      if (dto.experience_years !== undefined) {
        updates.push(`experience_years = $${paramCounter}`);
        values.push(dto.experience_years);
        paramCounter++;
      }

      if (dto.height_cm !== undefined) {
        updates.push(`height_cm = $${paramCounter}`);
        values.push(dto.height_cm);
        paramCounter++;
      }

      if (dto.preferred_side !== undefined) {
        updates.push(`preferred_side = $${paramCounter}`);
        values.push(dto.preferred_side);
        paramCounter++;
      }

      if (dto.notes !== undefined) {
        updates.push(`notes = $${paramCounter}`);
        values.push(dto.notes);
        paramCounter++;
      }

      if (dto.photo_url !== undefined) {
        updates.push(`photo_url = $${paramCounter}`);
        values.push(dto.photo_url);
        paramCounter++;
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      // Add updated_at
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add id as last parameter
      values.push(id);

      const pool = getDbPool();
      await pool.query(
        `UPDATE players
         SET ${updates.join(', ')}
         WHERE id = $${paramCounter}`,
        values
      );

      // Fetch updated player with calculated overall_rating
      const result = await pool.query<Player>(
        `SELECT * FROM players_with_overall WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a player
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pool = getDbPool();

      const result = await pool.query(
        'DELETE FROM players WHERE id = $1 AND full_name IS NOT NULL',
        [id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
