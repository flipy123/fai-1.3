import express from 'express';
import { gptService } from '../services/gptService.js';

const router = express.Router();

// Chat with GPT
router.post('/chat', async (req, res) => {
  try {
    const { message, context, provider } = req.body;
    const response = await gptService.chat(message, context, provider);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trading decision from GPT
router.post('/trading-decision', async (req, res) => {
  try {
    const { marketData, context, provider } = req.body;
    const decision = await gptService.getTradingDecision(marketData, context, provider);
    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update GPT memory
router.post('/update-memory', async (req, res) => {
  try {
    const { symbol, tradeData } = req.body;
    await gptService.updateMemory(symbol, tradeData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router as gptRoutes };