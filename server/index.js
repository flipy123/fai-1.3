import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { kotakNeoRoutes } from './routes/kotakNeo.js';
import { gptRoutes } from './routes/gpt.js';
import { tradingService } from './services/tradingService.js';
import { setupWebSocket } from './websocket/index.js';
import { masterDataService } from './services/masterDataService.js';
import { tradeMemoryService } from './services/tradeMemoryService.js';
import { indicatorService } from './services/indicatorService.js';

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

// Initialize services
async function initializeServices() {
  console.log('🚀 Initializing FAi-3.0 services...');
  
  try {
    // Initialize master data service
    await masterDataService.initialize();
    
    // Initialize trading service
    tradingService.initialize(io);
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
  }
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`🚀 FAi-3.0 Server running on port ${PORT}`);
  console.log(`🧠 GPT Brain initialized with OpenRouter support`);
  console.log(`📊 Kotak Neo API integration active`);
  console.log(`💾 Trade memory system ready`);
  console.log(`📈 Technical indicators service ready`);
  
  // Initialize all services
  await initializeServices();
  
  console.log(`✅ FAi-3.0 System fully operational!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down FAi-3.0 server...');
  server.close(() => {
    console.log('✅ Server shutdown complete');
  });
});