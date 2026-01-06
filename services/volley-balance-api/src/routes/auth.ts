import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';

const router = Router();

// Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', (err: any, user: any, info: any) => {
      if (err) {
        console.error('OAuth callback error:', err);
        return res.redirect('/?error=auth_failed&message=' + encodeURIComponent(err.message || 'Authentication failed'));
      }

      if (!user) {
        console.error('OAuth callback - no user:', info);
        return res.redirect('/?error=no_user&message=' + encodeURIComponent(info?.message || 'User not found'));
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.redirect('/?error=login_failed&message=' + encodeURIComponent(loginErr.message || 'Login failed'));
        }

        console.log('User authenticated successfully:', user.email);
        console.log('Session ID:', req.sessionID);
        console.log('Session before save:', JSON.stringify(req.session));
        console.log('Is authenticated:', req.isAuthenticated());

        // Force session to be saved and cookie to be sent
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Reset maxAge to force cookie update

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.redirect('/?error=session_save_failed');
          }

          console.log('Session saved to database');
          console.log('Session after save:', JSON.stringify(req.session));
          console.log('Response Set-Cookie header:', res.getHeader('Set-Cookie'));

          // Set cookie manually if not set
          if (!res.getHeader('Set-Cookie')) {
            console.error('WARNING: Set-Cookie header not present after session save!');
            console.log('Attempting to set cookie manually');

            const sessionCookie = `connect.sid=${req.sessionID}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${30 * 24 * 60 * 60}`;
            res.setHeader('Set-Cookie', sessionCookie);
            console.log('Manual cookie set:', sessionCookie);
          }

          console.log('Redirecting to home page');
          return res.redirect('/');
        });
      });
    })(req, res, next);
  }
);

// Get current user
router.get('/me', (req: Request, res: Response): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req: Request, res: Response, next: NextFunction): void => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Check authentication status
router.get('/check', (req: Request, res: Response) => {
  console.log('Auth check - Session ID:', req.sessionID);
  console.log('Auth check - Is authenticated:', req.isAuthenticated());
  console.log('Auth check - User:', req.user);
  console.log('Auth check - Cookies received:', req.headers.cookie);
  console.log('Auth check - Session object:', JSON.stringify(req.session));
  console.log('Auth check - Request secure:', req.secure);
  console.log('Auth check - Request protocol:', req.protocol);
  console.log('Auth check - X-Forwarded-Proto:', req.get('X-Forwarded-Proto'));

  res.json({
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? req.user : null,
  });
});

export default router;
