import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createHash } from 'crypto';

// Rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
});

// API rate limiter (general)
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for sensitive operations
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 requests per hour
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many failed attempts, please try again later'
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.stripe.com", "ws:", "wss:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for some features
});

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Parse additional allowed origins from environment
    const envOrigins = (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    const allowedOrigins = [
      // Development origins
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3030',
      'http://localhost:8080',
      // Production origins
      'https://personalabai.com',
      'https://www.personalabai.com',
      'https://persona-saas-lab.onrender.com',
      // Environment-configured origins
      process.env.FRONTEND_URL,
      ...envOrigins,
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        // Remove potential SQL injection patterns
        req.query[key] = (req.query[key] as string)
          .replace(/['";\\]/g, '')
          .trim();
      }
    }
  }

  // Sanitize body
  if (req.body) {
    sanitizeObject(req.body);
  }

  next();
};

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Basic XSS prevention
      obj[key] = obj[key]
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Request ID middleware for tracking
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 16);

  (req as any).id = id;
  res.setHeader('X-Request-Id', id);

  next();
};

// Audit logging middleware
export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const user = (req as any).user;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: user?.userId,
      userEmail: user?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    // Log security-relevant events
    if (
      req.path.includes('/auth') ||
      req.path.includes('/admin') ||
      req.path.includes('/billing') ||
      res.statusCode >= 400
    ) {
      console.log('[AUDIT]', JSON.stringify(logEntry));
    }
  });

  next();
};

// Prevent parameter pollution
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  // Convert arrays in query params to last value only
  if (req.query) {
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = (req.query[key] as string[])[
          (req.query[key] as string[]).length - 1
        ] as any;
      }
    }
  }
  next();
};

// Session validation middleware
export const validateSession = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user) {
    return next();
  }

  // Check if user session is still valid
  const tokenIssuedAt = user.iat;
  const now = Math.floor(Date.now() / 1000);
  const sessionAge = now - tokenIssuedAt;

  // Max session age: 24 hours
  if (sessionAge > 24 * 60 * 60) {
    return res.status(401).json({
      error: 'Session expired',
      message: 'Your session has expired. Please login again.'
    });
  }

  next();
};
