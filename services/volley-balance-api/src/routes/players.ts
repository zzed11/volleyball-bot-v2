import { Router } from 'express';
import { PlayersController } from '../controllers/playersController';

const router = Router();
const controller = new PlayersController();

// GET /api/players - List all players
router.get('/', (req, res, next) => controller.getAll(req, res, next));

// GET /api/players/:id - Get a single player
router.get('/:id', (req, res, next) => controller.getById(req, res, next));

// POST /api/players - Create a new player
router.post('/', (req, res, next) => controller.create(req, res, next));

// PATCH /api/players/:id - Update a player
router.patch('/:id', (req, res, next) => controller.update(req, res, next));

// DELETE /api/players/:id - Delete a player
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
