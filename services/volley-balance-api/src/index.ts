import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import connectPgSimple from 'connect-pg-simple';
import playersRouter from './routes/players';
import authRouter from './routes/auth';
import uploadRouter from './routes/upload';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { getDbPool, initDbPool, closeDbPool } from './config/database';
import { configureAuth } from './config/auth';
import { requireActiveUser } from './middleware/authenticate';
import { getSecret } from './config/secrets';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '8081', 10);

// Initialize Express app
async function createApp(): Promise<express.Application> {
  const app = express();

  // Initialize database connection pool
  await initDbPool();
  console.log('Database connection initialized');

  // Load session secret
  const sessionSecret = await getSecret('session-secret');

  // Trust proxy - required for secure cookies behind nginx/Cloudflare
  app.set('trust proxy', 1);

  // Middleware
  app.use(helmet()); // Security headers

  // CORS configuration - allow credentials
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://builder.volleyball-party.party',
    credentials: true,
  }));

  app.use(express.json()); // Parse JSON request bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

  // Session configuration
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: getDbPool() as any,
        tableName: 'sessions',
        createTableIfMissing: false, // We created it in migration
      }),
      name: 'connect.sid', // Explicitly set cookie name
      secret: sessionSecret || 'volleyball-session-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      proxy: true, // Trust the reverse proxy
      cookie: {
        secure: true, // Always require HTTPS for cookies
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'none', // Required for OAuth redirects through Cloudflare
        // Don't set domain - let it default to request hostname
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure authentication (load OAuth secrets)
  const dbPool = getDbPool();
  await configureAuth(dbPool);
  console.log('Authentication configured');

  // Request logging (simple version)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const setCookie = res.getHeader('Set-Cookie');
      if (setCookie) {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms [Set-Cookie: ${Array.isArray(setCookie) ? setCookie.length + ' cookies' : 'yes'}]`);
      } else {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      }
    });
    next();
  });

  // Health check endpoints
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'volley-balance-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', (_req, res) => {
    res.json({
      status: 'ready',
      service: 'volley-balance-api',
    });
  });

  // API routes
  app.use('/auth', authRouter);
  app.use('/api/players', requireActiveUser, playersRouter);
  app.use('/api/upload', requireActiveUser, uploadRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling
  app.use(errorHandler);

  return app;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDbPool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDbPool();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    const app = await createApp();

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Volley Balance API listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
