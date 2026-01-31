import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import {
  securityHeaders,
  corsOptions,
  sanitizeInput,
  requestId,
  auditLog,
  preventParameterPollution,
  apiRateLimiter
} from './middleware/security';
import { presenceService } from './services/presence';
import { specs, swaggerUi } from './config/swagger';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Socket.IO auth middleware validates JWT from auth payload or query
io.use((socket, next) => {
  try {
    const rawToken = (socket.handshake.auth as any)?.token || (socket.handshake.query?.token as string | undefined);
    if (!rawToken) {
      return next(new Error('Authentication required'));
    }
    const token = rawToken.replace(/^Bearer\s+/i, '');
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    (socket.data as any).user = user;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

export const prisma = new PrismaClient();

// Security Middleware (order matters!)
app.use(requestId); // Add request ID first
app.use(auditLog); // Log all requests
app.use(securityHeaders); // Security headers
app.use(cors(corsOptions)); // CORS with proper config
app.use(preventParameterPollution); // Prevent parameter pollution
// Apply JSON parsers except for Stripe webhook which needs raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    return next();
  }
  return express.json({ limit: '10mb' })(req, res, (err) => {
    if (err) return next(err);
    return express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  });
});
app.use(sanitizeInput); // Sanitize all input
app.use('/api', apiRateLimiter); // Rate limit API endpoints

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Check if the API server is running and responsive
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    adminMode: process.env.ADMIN_MODE === 'true'
  });
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2563eb; }
    .swagger-ui .scheme-container {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  `,
  customSiteTitle: 'PersonaLab Pro API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'tag',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
}));

// Serve OpenAPI spec as JSON
app.get('/api/docs/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Import routes
import authRoutes from './routes/auth';
import personaRoutes from './routes/personas';
import experimentRoutes from './routes/experiments';
import icpRoutes from './routes/icps';
import billingRoutes from './routes/billing';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import mcpOrchestrationRoutes from './routes/mcp-orchestration';
import chatRoutes from './routes/chat';
import competitorRoutes from './routes/competitors';
// import analyticsRoutes from './routes/analytics'; // Temporarily disabled due to schema issues

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/icps', icpRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/mcp', mcpOrchestrationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/competitors', competitorRoutes);

// Socket.IO connection handling with MCP integration and chat
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // User authentication for presence tracking
  socket.on('authenticate', (data: { userId: string, token: string }) => {
    try {
      const raw = (data?.token || '') as string;
      const token = raw.replace(/^Bearer\s+/i, '');
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      // Optional: ensure the provided userId matches token subject if present
      const userId = data.userId || decoded.sub || decoded.userId || decoded.id;
      if (!userId) {
        throw new Error('Missing user identifier');
      }
      presenceService.addUser(socket.id, userId);
      (socket.data as any).user = decoded;

      socket.emit('authenticated', {
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      socket.emit('authenticated', { success: false, error: 'Invalid or expired token' });
      socket.disconnect(true);
    }
  });

  // Experiment rooms
  socket.on('join-experiment', (experimentId: string) => {
    socket.join(`experiment-${experimentId}`);
    console.log(`Socket ${socket.id} joined experiment ${experimentId}`);
  });

  socket.on('join-group', (groupId: string) => {
    socket.join(`group-${groupId}`);
    console.log(`Socket ${socket.id} joined group ${groupId}`);
  });

  // Chat rooms
  socket.on('join-chat-room', (roomId: string) => {
    socket.join(`chat-${roomId}`);
    console.log(`Socket ${socket.id} joined chat room ${roomId}`);

    // Update presence service
    presenceService.joinRoom(socket.id, roomId);

    // Broadcast user joined
    socket.to(`chat-${roomId}`).emit('user-joined', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Send current room presence to the joining user
    const roomPresence = presenceService.getRoomPresence(roomId);
    socket.emit('room-presence-update', roomPresence);
  });

  socket.on('leave-chat-room', (roomId: string) => {
    socket.leave(`chat-${roomId}`);
    console.log(`Socket ${socket.id} left chat room ${roomId}`);

    // Update presence service
    presenceService.leaveRoom(socket.id, roomId);

    // Broadcast user left
    socket.to(`chat-${roomId}`).emit('user-left', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  // Typing indicators
  socket.on('typing-start', (data: { roomId: string; userId: string; personaId?: string; personaName?: string }) => {
    presenceService.startTyping(socket.id, data.roomId, data.personaId);
    presenceService.updateLastSeen(socket.id);
  });

  socket.on('typing-stop', (data: { roomId: string; userId: string; personaId?: string }) => {
    presenceService.stopTyping(socket.id, data.roomId);
    presenceService.updateLastSeen(socket.id);
  });

  // User status updates
  socket.on('status-update', (data: { status: 'online' | 'away' | 'busy' | 'offline' }) => {
    presenceService.updateUserStatus(socket.id, data.status);
    presenceService.updateLastSeen(socket.id);
  });

  // Message reactions
  socket.on('message-reaction', (data: { roomId: string; messageId: string; reaction: string; action: 'add' | 'remove' }) => {
    socket.to(`chat-${data.roomId}`).emit('message-reaction-update', {
      messageId: data.messageId,
      reaction: data.reaction,
      action: data.action,
      timestamp: new Date().toISOString(),
    });
    presenceService.updateLastSeen(socket.id);
  });

  // AI response triggering
  socket.on('trigger-ai-responses', (data: { roomId: string; messageId: string }) => {
    // This will be handled by the chat route API
    socket.to(`chat-${data.roomId}`).emit('ai-responses-triggered', {
      messageId: data.messageId,
      timestamp: new Date().toISOString(),
    });
    presenceService.updateLastSeen(socket.id);
  });

  // Presence queries
  socket.on('get-room-presence', (roomId: string) => {
    const roomPresence = presenceService.getRoomPresence(roomId);
    socket.emit('room-presence-update', roomPresence);
  });

  socket.on('get-user-presence', (userId: string) => {
    const userPresence = presenceService.getUserPresence(userId);
    socket.emit('user-presence-data', {
      userId,
      presence: userPresence,
      timestamp: new Date().toISOString(),
    });
  });

  // Competitor analysis rooms
  socket.on('join-competitor-analysis', (analysisId: string) => {
    socket.join(`competitor-analysis-${analysisId}`);
    console.log(`Socket ${socket.id} joined competitor analysis ${analysisId}`);
  });

  // MCP orchestration events
  socket.on('join-mcp-experiment', (mcpExperimentId: string) => {
    socket.join(`mcp-experiment-${mcpExperimentId}`);
    console.log(`Socket ${socket.id} joined MCP experiment ${mcpExperimentId}`);
  });

  socket.on('mcp-persona-update', (data: any) => {
    // Broadcast persona update to relevant rooms
    io.to(`mcp-experiment-${data.experimentId}`).emit('persona-response', data);
  });

  socket.on('mcp-experiment-status', (data: any) => {
    // Broadcast experiment status update
    io.to(`mcp-experiment-${data.experimentId}`).emit('experiment-status', data);
  });

  socket.on('mcp-focus-group-update', (data: any) => {
    // Broadcast focus group updates
    io.to(`group-${data.groupId}`).emit('focus-group-update', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    presenceService.removeUser(socket.id);
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3005');

server.listen(PORT, () => {
  console.log(`🚀 PersonaLab Pro Backend API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`👑 Admin Mode: ${process.env.ADMIN_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

export { io };
