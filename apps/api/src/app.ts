import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { isDatabaseConnected } from './config/db';
import authRoutes from './routes/auth';
import ordersRoutes from './routes/orders';
import feedbackRoutes from './routes/feedback';
import notificationsRoutes from './routes/notifications';

export const app = express();

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:3333'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/orders', ordersRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/notifications', notificationsRoutes);

// Health check
app.get('/', (_req, res) => {
  res.send({ message: 'Skrapo API is running' });
});

app.get('/health', (_req, res) => {
  res.status(200).send({
    status: 'ok',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Global Error Handler] Error on ${req.method} ${req.url}:`, err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.url,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
