import express from 'express';
import { kotakNeoService } from '../services/kotakNeoService.js';

const router = express.Router();

// Authentication callback (for OAuth2 flow)
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    // Handle OAuth2 callback
    // This would typically exchange the code for an access token
    console.log('OAuth2 callback received:', { code, state });
    
    res.json({ 
      success: true, 
      message: 'Authorization successful',
      redirectUrl: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : '/'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all indices for dropdown
router.get('/indices', async (req, res) => {
  try {
    const indices = await kotakNeoService.getIndices();
    res.json(indices);
  } catch (error) {
    console.error('Error fetching indices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get live market data
router.get('/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const marketData = await kotakNeoService.getMarketData(symbol);
    res.json(marketData);
  } catch (error) {
    console.error(`Error fetching market data for ${req.params.symbol}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get option chain
router.get('/option-chain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const optionChain = await kotakNeoService.getOptionChain(symbol);
    res.json(optionChain);
  } catch (error) {
    console.error(`Error fetching option chain for ${req.params.symbol}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get positions
router.get('/positions', async (req, res) => {
  try {
    const positions = await kotakNeoService.getPositions();
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await kotakNeoService.getOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Place order
router.post('/order', async (req, res) => {
  try {
    const order = await kotakNeoService.placeOrder(req.body);
    res.json(order);
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get wallet balance
router.get('/wallet', async (req, res) => {
  try {
    const wallet = await kotakNeoService.getWallet();
    res.json(wallet);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket status
router.get('/ws-status', (req, res) => {
  res.json({
    connected: kotakNeoService.isConnected,
    subscribedTokens: kotakNeoService.subscribedTokens.size,
    maxTokens: kotakNeoService.maxTokens
  });
});

// Subscribe to additional tokens
router.post('/subscribe', (req, res) => {
  try {
    const { tokens } = req.body;
    
    if (!Array.isArray(tokens)) {
      return res.status(400).json({ error: 'Tokens must be an array' });
    }

    const results = tokens.map(token => ({
      token,
      subscribed: kotakNeoService.subscribeToToken(token)
    }));

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe from tokens
router.post('/unsubscribe', (req, res) => {
  try {
    const { tokens } = req.body;
    
    if (!Array.isArray(tokens)) {
      return res.status(400).json({ error: 'Tokens must be an array' });
    }

    const results = tokens.map(token => ({
      token,
      unsubscribed: kotakNeoService.unsubscribeFromToken(token)
    }));

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router as kotakNeoRoutes };