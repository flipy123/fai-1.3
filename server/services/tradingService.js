import { gptService } from './gptService.js';
import { kotakNeoService } from './kotakNeoService.js';

class TradingService {
  constructor() {
    this.isActive = false;
    this.currentSymbol = null;
    this.gptInterval = 8000; // 8 seconds default
    this.dataInterval = 1000; // 1 second for data fetch
    this.io = null;
    this.gptTimer = null;
    this.dataTimer = null;
    this.isTestMode = true;
    this.gptProvider = 'openai';
  }

  initialize(io) {
    this.io = io;
    console.log('🤖 Trading Service initialized');
  }

  start(symbol, testMode = true, gptProvider = 'openai') {
    if (this.isActive) {
      this.stop();
    }

    this.isActive = true;
    this.currentSymbol = symbol;
    this.isTestMode = testMode;
    this.gptProvider = gptProvider;

    console.log(`🚀 Trading started for ${symbol} (${testMode ? 'TEST' : 'LIVE'} mode)`);

    // Start data fetching every 1 second
    this.dataTimer = setInterval(() => {
      this.fetchAndBroadcastData();
    }, this.dataInterval);

    // Start GPT decision making every 8 seconds
    this.gptTimer = setInterval(() => {
      this.getGPTDecision();
    }, this.gptInterval);

    // Initial data fetch
    this.fetchAndBroadcastData();
    
    this.io.emit('trading-started', {
      symbol,
      testMode,
      gptProvider,
      gptInterval: this.gptInterval
    });
  }

  stop() {
    this.isActive = false;
    
    if (this.dataTimer) {
      clearInterval(this.dataTimer);
      this.dataTimer = null;
    }
    
    if (this.gptTimer) {
      clearInterval(this.gptTimer);
      this.gptTimer = null;
    }

    console.log('⏹️ Trading stopped');
    this.io?.emit('trading-stopped');
  }

  async fetchAndBroadcastData() {
    if (!this.isActive || !this.currentSymbol) return;

    try {
      const [marketData, positions, orders, wallet, optionChain] = await Promise.all([
        kotakNeoService.getMarketData(this.currentSymbol),
        kotakNeoService.getPositions(),
        kotakNeoService.getOrders(),
        kotakNeoService.getWallet(),
        kotakNeoService.getOptionChain(this.currentSymbol)
      ]);

      const data = {
        marketData,
        positions,
        orders,
        wallet,
        optionChain,
        timestamp: new Date().toISOString()
      };

      this.io.emit('market-data', data);
    } catch (error) {
      console.error('❌ Error fetching market data:', error);
      this.io.emit('error', { message: error.message });
    }
  }

  async getGPTDecision() {
    if (!this.isActive || !this.currentSymbol) return;

    try {
      const [marketData, positions, orders, wallet] = await Promise.all([
        kotakNeoService.getMarketData(this.currentSymbol),
        kotakNeoService.getPositions(),
        kotakNeoService.getOrders(),
        kotakNeoService.getWallet()
      ]);

      const context = {
        symbol: this.currentSymbol,
        positions,
        orders,
        wallet,
        testMode: this.isTestMode
      };

      const decision = await gptService.getTradingDecision(marketData, context, this.gptProvider);
      
      console.log('🧠 GPT Decision:', decision);
      
      this.io.emit('gpt-decision', {
        decision,
        timestamp: new Date().toISOString(),
        symbol: this.currentSymbol
      });

      // Execute decision if not HOLD
      if (decision.action !== 'HOLD') {
        await this.executeDecision(decision);
      }

    } catch (error) {
      console.error('❌ Error getting GPT decision:', error);
      this.io.emit('error', { message: error.message });
    }
  }

  async executeDecision(decision) {
    if (this.isTestMode) {
      console.log('📝 TEST MODE - Would execute:', decision);
      this.io.emit('trade-log', {
        type: 'test',
        message: `TEST: ${decision.action} ${decision.quantity} ${decision.symbol} @ ${decision.price}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const orderData = {
        symbol: decision.symbol,
        side: decision.action,
        quantity: decision.quantity,
        price: decision.price,
        stopLoss: decision.stopLoss,
        target: decision.target
      };

      const result = await kotakNeoService.placeOrder(orderData);
      
      console.log('📈 Order executed:', result);
      
      this.io.emit('trade-log', {
        type: 'live',
        message: `LIVE: ${decision.action} ${decision.quantity} ${decision.symbol} @ ${decision.price} - ${result.status}`,
        timestamp: new Date().toISOString()
      });

      // Update GPT memory
      gptService.updateMemory(this.currentSymbol, {
        ...decision,
        result,
        executed: true
      });

    } catch (error) {
      console.error('❌ Error executing decision:', error);
      this.io.emit('error', { message: error.message });
    }
  }

  setGPTInterval(interval) {
    this.gptInterval = interval;
    
    if (this.isActive && this.gptTimer) {
      clearInterval(this.gptTimer);
      this.gptTimer = setInterval(() => {
        this.getGPTDecision();
      }, this.gptInterval);
    }
  }

  switchProvider(provider) {
    this.gptProvider = provider;
    console.log(`🔄 Switched to ${provider} provider`);
  }
}

export const tradingService = new TradingService();