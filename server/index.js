import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { kotakNeoRoutes } from './routes/kotakNeo.js';
import { gptRoutes } from './routes/gpt.js';
import { tradingService } from './services/tradingService.js';
import { setupWebSocket } from './websocket/index.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/kotak', kotakNeoRoutes);
app.use('/api/gpt', gptRoutes);

// WebSocket setup
setupWebSocket(io);

// Initialize trading service
tradingService.initialize(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 FAi-3.0 Server running on port ${PORT}`);
  console.log(`🧠 GPT Brain initialized`);
  console.log(`📊 Trading system ready`);
});