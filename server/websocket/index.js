import { tradingService } from '../services/tradingService.js';

export function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log('👤 Client connected:', socket.id);

    socket.on('start-trading', (data) => {
      const { symbol, testMode, gptProvider } = data;
      tradingService.start(symbol, testMode, gptProvider);
    });

    socket.on('stop-trading', () => {
      tradingService.stop();
    });

    socket.on('set-gpt-interval', (interval) => {
      tradingService.setGPTInterval(interval);
    });

    socket.on('switch-provider', (provider) => {
      tradingService.switchProvider(provider);
    });

    socket.on('disconnect', () => {
      console.log('👤 Client disconnected:', socket.id);
    });
  });
}