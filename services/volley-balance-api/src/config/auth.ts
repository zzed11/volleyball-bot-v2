import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Pool } from 'pg';
import { getSecret } from './secrets';

interface User {
  id: number;
  email: string;
  google_id: string;
  full_name: string | null;
  picture_url: string | null;
  is_active: boolean;
}

export async function configureAuth(pool: Pool): Promise<void> {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const result = await pool.query<User>(
        'SELECT id, email, google_id, full_name, picture_url, is_active FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return done(null, false);
      }

      done(null, result.rows[0]);
    } catch (error) {
      done(error, false);
    }
  });

  // Configure Google OAuth strategy
  const clientID = await getSecret('google-client-id');
  const clientSecret = await getSecret('google-client-secret');
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'https://builder.volleyball-party.party/auth/google/callback';

  if (!clientID || !clientSecret) {
    console.warn('Google OAuth credentials not configured. Authentication will not work.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['profile', 'email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Check if email is invited
          const invitationResult = await pool.query(
            'SELECT email, is_active FROM invitations WHERE email = $1 AND is_active = true',
            [email]
          );

          if (invitationResult.rows.length === 0) {
            return done(new Error('Email not invited. Please request an invitation.'), undefined);
          }

          // Check if user exists
          let userResult = await pool.query<User>(
            'SELECT id, email, google_id, full_name, picture_url, is_active FROM users WHERE google_id = $1',
            [profile.id]
          );

          let user: User;

          if (userResult.rows.length === 0) {
            // Create new user
            const insertResult = await pool.query<User>(
              `INSERT INTO users (email, google_id, full_name, picture_url, last_login_at)
               VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
               RETURNING id, email, google_id, full_name, picture_url, is_active`,
              [email, profile.id, profile.displayName, profile.photos?.[0]?.value]
            );

            user = insertResult.rows[0];

            // Mark invitation as accepted
            await pool.query(
              'UPDATE invitations SET accepted_at = CURRENT_TIMESTAMP WHERE email = $1',
              [email]
            );
          } else {
            user = userResult.rows[0];

            // Update last login
            await pool.query(
              'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
              [user.id]
            );
          }

          // Check if user is active
          if (!user.is_active) {
            return done(new Error('Account is inactive. Please contact an administrator.'), undefined);
          }

          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
}
