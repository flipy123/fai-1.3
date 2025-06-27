import express from 'express';
import { kotakNeoService } from '../services/kotakNeoService.js';
import { masterDataService } from '../services/masterDataService.js';
import { tradeMemoryService } from '../services/tradeMemoryService.js';

const router = express.Router();

// Authentication status
router.get('/auth-status', (req, res) => {
  const status = kotakNeoService.getConnectionStatus();
  res.json(status);
});

// Authentication callback (for OAuth2 flow if needed)
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

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
    console.log('📊 Fetching indices...');
    
    // Get indices from master data service first
    const masterIndices = masterDataService.getAllIndices();
    
    // Get live data from Kotak Neo service
    const liveIndices = await kotakNeoService.getIndices();
    
    // Merge master data with live data
    const indices = masterIndices.map(masterIndex => {
      const liveData = liveIndices.find(live => live.symbol === masterIndex.symbol);
      return {
        ...masterIndex,
        ltp: liveData?.ltp || 0,
        change: liveData?.change || 0,
        changePercent: liveData?.changePercent || 0,
        high: liveData?.high || 0,
        low: liveData?.low || 0,
        volume: liveData?.volume || 0
      };
    });

    console.log(`✅ Returning ${indices.length} indices`);
    res.json(indices);
  } catch (error) {
    console.error('❌ Error fetching indices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get live market data
router.get('/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`📈 Fetching market data for ${symbol}`);
    
    const marketData = await kotakNeoService.getMarketData(symbol);
    res.json(marketData);
  } catch (error) {
    console.error(`❌ Error fetching market data for ${req.params.symbol}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get option chain
router.get('/option-chain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`📊 Fetching option chain for ${symbol}`);
    
    const optionChain = await kotakNeoService.getOptionChain(symbol);
    res.json(optionChain);
  } catch (error) {
    console.error(`❌ Error fetching option chain for ${req.params.symbol}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get positions
router.get('/positions', async (req, res) => {
  try {
    console.log('📋 Fetching positions...');
    const positions = await kotakNeoService.getPositions();
    res.json(positions);
  } catch (error) {
    console.error('❌ Error fetching positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders
router.get('/orders', async (req, res) => {
  try {
    console.log('📋 Fetching orders...');
    const orders = await kotakNeoService.getOrders();
    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Place order
router.post('/order', async (req, res) => {
  try {
    console.log('📝 Placing order:', req.body);
    const order = await kotakNeoService.placeOrder(req.body);
    
    // Log the trade in memory
    tradeMemoryService.addTrade(req.body.symbol, {
      action: req.body.side,
      symbol: req.body.symbol,
      quantity: req.body.quantity,
      price: req.body.price,
      stopLoss: req.body.stopLoss,
      target: req.body.target,
      status: 'PENDING',
      orderId: order.orderId
    });
    
    res.json(order);
  } catch (error) {
    console.error('❌ Error placing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get wallet balance
router.get('/wallet', async (req, res) => {
  try {
    console.log('💰 Fetching wallet...');
    const wallet = await kotakNeoService.getWallet();
    res.json(wallet);
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket status
router.get('/ws-status', (req, res) => {
  const status = kotakNeoService.getConnectionStatus();
  res.json(status);
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

// Master data endpoints
router.get('/master-data/stats', (req, res) => {
  try {
    const stats = masterDataService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/master-data/refresh', async (req, res) => {
  try {
    await masterDataService.forceRefresh();
    res.json({ success: true, message: 'Master data refreshed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trading endpoints
router.get('/trading/stats/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const stats = tradeMemoryService.getPerformanceMetrics(symbol);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trading/reset-all', (req, res) => {
  try {
    const { symbol } = req.body;
    tradeMemoryService.resetTrades(symbol);
    res.json({ success: true, message: 'Trades reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/trading/dashboard-stats', (req, res) => {
  try {
    const stats = tradeMemoryService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router as kotakNeoRoutes };