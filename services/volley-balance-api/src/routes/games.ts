import { Router } from 'express';
import { GamesController } from '../controllers/gamesController';

const router = Router();
const controller = new GamesController();

// Game CRUD
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/analytics/player-participation', (req, res, next) => controller.getPlayerParticipationStats(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.patch('/:id', (req, res, next) => controller.update(req, res, next));

// Feedback
router.post('/:id/feedback', (req, res, next) => controller.createFeedback(req, res, next));

// Utilities
router.post('/auto-complete-past', (req, res, next) => controller.autoCompletePast(req, res, next));

export default router;
