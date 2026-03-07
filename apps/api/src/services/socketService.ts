import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

let io: SocketIOServer | null = null;

if (!process.env.JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable is missing in socketService.');
}
const JWT_SECRET = process.env.JWT_SECRET;

export const initSocket = (server: Server) => {
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:3333'];

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    // Try to get token from auth handshake (legacy/mobile) or from the raw cookie header (browser)
    let token = socket.handshake.auth.token;
    
    if (!token && socket.request.headers.cookie) {
      const cookies = socket.request.headers.cookie.split('; ').reduce((acc: any, cur: string) => {
        const [name, value] = cur.split('=');
        acc[name] = value;
        return acc;
      }, {});
      token = cookies['skrapo_token'];
    }

    if (!token) {
      console.warn(`[socket] Auth failed: No token found in handshake or cookies.`);
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      console.warn(`[socket] Auth failed: Invalid token.`);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    
    if (user.role === 'admin') {
      socket.join('admin_room');
    }
    
    if (user.role === 'scrapChamp') {
      socket.join('champ_room');
    }
    
    if (user.userId) {
      socket.join(`user_${user.userId}`);
    }
  });
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitAndLog = (room: string, event: string, data: any) => {
  const ioInstance = getIO();
  ioInstance.to(room).emit(event, data);

  const logFilePath = path.join(process.cwd(), 'SOCKET_EVENTS.log');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] To: ${room} | Event: ${event} | Data: ${JSON.stringify(data)}\n`;
  
  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) console.error('[socket] Failed to write to log file:', err);
  });
};
