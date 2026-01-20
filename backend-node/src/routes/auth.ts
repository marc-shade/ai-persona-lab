import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { prisma } from '../server';
import { authRateLimiter, strictRateLimiter } from '../middleware/security';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3005'}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { email },
            include: { subscription: true, organization: true },
          });

          if (!user) {
            // Create new user from Google profile
            user = await prisma.user.create({
              data: {
                email,
                passwordHash: '', // OAuth users don't have passwords
                firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
                lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
                googleId: profile.id,
                avatarUrl: profile.photos?.[0]?.value,
                emailVerified: true, // Google emails are verified
                isActive: true,
              },
              include: { subscription: true, organization: true },
            });

            // Create free subscription for new OAuth users
            await prisma.subscription.create({
              data: {
                userId: user.id,
                stripeCustomerId: `google_${user.id}`,
                plan: 'FREE',
                status: 'ACTIVE',
              },
            });

            // Refetch with subscription
            user = await prisma.user.findUnique({
              where: { id: user.id },
              include: { subscription: true, organization: true },
            });
          } else if (!user.googleId) {
            // Link Google account to existing user
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: profile.id,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                emailVerified: true,
              },
              include: { subscription: true, organization: true },
            });
          }

          if (!user) {
            return done(new Error('Failed to create or find user'), undefined);
          }

          return done(null, user as any);
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize user for session (we use JWT, so minimal serialization)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { subscription: true, organization: true },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  console.log('✅ Google OAuth configured');
} else {
  console.warn('⚠️ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// Initialize passport middleware
router.use(passport.initialize());

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     description: |
 *       Create a new user account with email and password.
 *       Automatically creates a free subscription and generates JWT tokens.
 *
 *       **Rate Limited**: 5 requests per minute per IP
 *
 *       **Password Requirements:**
 *       - Minimum 8 characters
 *       - Recommended to include uppercase, lowercase, numbers, and symbols
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             business_user:
 *               summary: Business User
 *               value:
 *                 email: "sarah@company.com"
 *                 password: "SecurePass123!"
 *                 firstName: "Sarah"
 *                 lastName: "Johnson"
 *                 company: "Acme Corporation"
 *             individual_user:
 *               summary: Individual User
 *               value:
 *                 email: "john.doe@gmail.com"
 *                 password: "MyPassword456"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               user:
 *                 id: "cm1abc123xyz"
 *                 email: "sarah@company.com"
 *                 firstName: "Sarah"
 *                 lastName: "Johnson"
 *                 company: "Acme Corporation"
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Email already registered"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Register (with rate limiting)
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, company } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        company
      }
    });

    // Create free subscription
    await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `temp_${user.id}`,
        plan: 'FREE',
        status: 'ACTIVE'
      }
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate user login
 *     description: |
 *       Authenticate a user with email and password credentials.
 *       Returns JWT access and refresh tokens on successful login.
 *
 *       **Rate Limited**: 5 requests per minute per IP
 *
 *       **Admin Development Mode:**
 *       In development mode with ADMIN_MODE=true, special admin credentials
 *       can be used to bypass normal authentication for testing purposes.
 *
 *       **Token Lifetimes:**
 *       - Access Token: 1 hour
 *       - Refresh Token: 7 days
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             normal_login:
 *               summary: Normal User Login
 *               value:
 *                 email: "user@example.com"
 *                 password: "password123"
 *             admin_login:
 *               summary: Admin Login (Development Only)
 *               value:
 *                 email: "admin@personalabpro.com"
 *                 password: "admin_password"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               user:
 *                 id: "cm1abc123xyz"
 *                 email: "user@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 role: "USER"
 *                 subscription:
 *                   plan: "FREE"
 *                   status: "ACTIVE"
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials or inactive account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid credentials"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Login (with rate limiting and admin protection)
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check for admin bypass (development only, with strict rate limiting)
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.ADMIN_MODE === 'true' &&
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Additional security: log admin access attempts
      console.warn(`[SECURITY] Admin bypass login attempt from IP: ${req.ip} at ${new Date().toISOString()}`);

      // Apply strict rate limiting for admin attempts
      if ((req as any).rateLimit && (req as any).rateLimit.remaining < 1) {
        return res.status(429).json({ error: 'Too many admin login attempts' });
      }
      // Create or get admin user
      let adminUser = await prisma.user.findUnique({
        where: { email: process.env.ADMIN_EMAIL },
        include: { subscription: true, organization: true }
      });

      if (!adminUser) {
        // Create admin user
        adminUser = await prisma.user.create({
          data: {
            email: process.env.ADMIN_EMAIL!,
            passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12),
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            isAdmin: true,
            bypassBilling: true,
            emailVerified: true
          },
          include: { subscription: true, organization: true }
        });

        // Create unlimited subscription
        await prisma.subscription.create({
          data: {
            userId: adminUser.id,
            stripeCustomerId: `admin_${adminUser.id}`,
            plan: 'ENTERPRISE',
            status: 'ACTIVE',
            personasLimit: -1,
            experimentsLimit: -1,
            apiCallsLimit: -1
          }
        });
      }

      const accessToken = jwt.sign(
        {
          userId: adminUser.id,
          email: adminUser.email,
          role: 'ADMIN',
          isAdmin: true,
          bypassBilling: true
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: adminUser.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      return res.json({
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
          role: adminUser.role,
          isAdmin: true,
          bypassBilling: true,
          onboardingCompleted: true,
          tenantId: adminUser.organizationId || 'default',
          tenant: {
            id: adminUser.organizationId || 'default',
            name: adminUser.organization?.name || 'Default Organization',
            plan: 'ENTERPRISE'
          }
        },
        accessToken,
        refreshToken
      });
    }

    // Normal login
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true, organization: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        isAdmin: user.isAdmin,
        bypassBilling: user.bypassBilling
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        company: user.company,
        role: user.role,
        subscription: user.subscription,
        onboardingCompleted: true,
        tenantId: user.organizationId || 'default',
        tenant: {
          id: user.organizationId || 'default',
          name: user.organization?.name || 'Default Organization',
          plan: user.subscription?.plan || 'FREE'
        }
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: |
 *       Use a valid refresh token to obtain a new access token.
 *       This endpoint allows clients to maintain authentication
 *       without requiring the user to log in again.
 *
 *       **Token Validation:**
 *       - Refresh token must be valid and not expired
 *       - Associated user must still be active
 *       - Returns a new access token with 1-hour expiration
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token
 *             example:
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid refresh token"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        isAdmin: user.isAdmin,
        bypassBilling: user.bypassBilling
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Request password reset link (dev-friendly)
router.post('/forgot-password', strictRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond 200 to avoid account enumeration
    if (!user) {
      return res.json({ success: true });
    }

    // Sign a short-lived reset token (1 hour)
    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      process.env.JWT_RESET_SECRET || process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // In production, send email. For dev, log token for testing.
    console.log(`[DEV] Password reset token for ${email}: ${token}`);

    return res.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', strictRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || process.env.JWT_SECRET!);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password_reset' || !decoded.userId) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current user (token introspection)
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.userId },
      include: { subscription: true, organization: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      subscription: user.subscription,
      onboardingCompleted: true,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate Google OAuth login
 *     description: |
 *       Redirects to Google's OAuth consent page.
 *       After authentication, user is redirected to /api/auth/google/callback.
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent page
 */
router.get('/google', (req: Request, res: Response, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }

  // Store the redirect URL in session/state for after OAuth completes
  const redirectUrl = req.query.redirect as string || process.env.FRONTEND_URL || 'http://localhost:3030';
  const state = Buffer.from(JSON.stringify({ redirectUrl })).toString('base64');

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Google OAuth callback
 *     description: |
 *       Handles the OAuth callback from Google.
 *       Creates or links user account and redirects to frontend with tokens.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter containing redirect URL
 *     responses:
 *       302:
 *         description: Redirect to frontend with auth tokens
 *       401:
 *         description: Authentication failed
 */
router.get('/google/callback', (req: Request, res: Response, next) => {
  passport.authenticate('google', { session: false }, async (err: Error | null, user: any) => {
    try {
      // Parse redirect URL from state
      let redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3030';
      try {
        if (req.query.state) {
          const state = JSON.parse(Buffer.from(req.query.state as string, 'base64').toString());
          if (state.redirectUrl) {
            redirectUrl = state.redirectUrl;
          }
        }
      } catch (e) {
        console.warn('Failed to parse OAuth state:', e);
      }

      if (err || !user) {
        console.error('Google OAuth callback error:', err);
        return res.redirect(`${redirectUrl}/auth/login?error=oauth_failed&message=${encodeURIComponent(err?.message || 'Authentication failed')}`);
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          isAdmin: user.isAdmin,
          bypassBilling: user.bypassBilling,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Redirect to frontend with tokens (using URL fragment for security)
      // Use root path for frontend-simple compatibility, Next.js will handle via client-side routing
      const callbackUrl = new URL('/', redirectUrl);
      callbackUrl.hash = `access_token=${accessToken}&refresh_token=${refreshToken}`;

      return res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error('OAuth callback processing error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3030'}/auth/login?error=server_error`);
    }
  })(req, res, next);
});

/**
 * @swagger
 * /api/auth/oauth:
 *   post:
 *     tags: [Authentication]
 *     summary: Handle OAuth user data (for NextAuth compatibility)
 *     description: |
 *       Creates or links user from OAuth provider data.
 *       Used by NextAuth on the frontend to sync OAuth users.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - provider
 *               - providerId
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               provider:
 *                 type: string
 *                 enum: [google, github]
 *               providerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/oauth', async (req: Request, res: Response) => {
  try {
    const { email, name, provider, providerId } = req.body;

    if (!email || !provider || !providerId) {
      return res.status(400).json({ error: 'Missing required OAuth fields' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true, organization: true },
    });

    const providerIdField = provider === 'google' ? 'googleId' : 'githubId';
    const nameParts = (name || '').split(' ');

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: '',
          firstName: nameParts[0] || 'User',
          lastName: nameParts.slice(1).join(' ') || '',
          [providerIdField]: providerId,
          emailVerified: true,
          isActive: true,
        },
        include: { subscription: true, organization: true },
      });

      // Create free subscription
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: `${provider}_${user.id}`,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });

      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { subscription: true, organization: true },
      });
    } else if (!(user as any)[providerIdField]) {
      // Link provider to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          [providerIdField]: providerId,
          emailVerified: true,
        },
        include: { subscription: true, organization: true },
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user!.id,
        email: user!.email,
        role: user!.role,
        organizationId: user!.organizationId,
        isAdmin: user!.isAdmin,
        bypassBilling: user!.bypassBilling,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user!.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user!.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      user: {
        id: user!.id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        name: `${user!.firstName} ${user!.lastName}`,
        role: user!.role,
        subscription: user!.subscription,
        organizationId: user!.organizationId,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});

export default router;
