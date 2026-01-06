import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadPlayerPhoto } from '../config/storage';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

/**
 * POST /api/upload/player-photo
 * Upload a player photo to Google Cloud Storage
 */
router.post('/player-photo', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Optional: player ID for organizing files
    const playerId = req.body.playerId ? parseInt(req.body.playerId, 10) : undefined;

    // Upload to GCS
    const photoUrl = await uploadPlayerPhoto(req.file, playerId);

    res.json({
      photo_url: photoUrl,
      message: 'Photo uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
